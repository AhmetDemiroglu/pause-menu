using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace GGHub.WebAPI.Middleware
{
    /// <summary>
    /// Origin kilidi + gercek istemci IP'si.
    ///
    /// 1) Railway'in kenar sunuculari Host basligina gore yonlendiriyor: `curl --resolve
    ///    api.pausemenu.app:443:&lt;railway-ip&gt;` ile Cloudflare'in onbellegi, kurallari ve hiz siniri
    ///    atlanabiliyordu (22 Kas 2026'da dogrulandi). Cloudflare her istege Transform Rule ile gizli
    ///    bir baslik (X-Origin-Auth) ekler; baslik yoksa istek Cloudflare'den gelmemistir ve 403 alir.
    ///    Web sunucusunun (SSR, /api/track) API istekleri ayni basligi kendisi ekler.
    ///
    /// 2) Cloudflare arkasinda RemoteIpAddress (X-Forwarded-For'un en sagi) Cloudflare kenarinin
    ///    IP'sidir: IP bazli hiz sinirlari (LoginPolicy vb.) ayni Cloudflare noktasindan gelen tum
    ///    kullanicilarda tek kovaya cokuyordu. Istek kilitten SIR ILE gectiyse CF-Connecting-IP
    ///    guvenilirdir (yalniz Cloudflare yazabilir) ve RemoteIpAddress ona cevrilir; boylece mevcut
    ///    tum IP politikalari ve hata kayitlari gercek istemciyi gorur.
    ///
    /// Basarisizlikta ACIK: ORIGIN_AUTH_SECRET tanimli degilse ikisi de devre disi, davranis eskisi gibi.
    /// Acilis sirasi ve web tarafi: ui/src/core/lib/origin-auth.ts.
    /// </summary>
    public class OriginAuthMiddleware
    {
        public const string HeaderName = "X-Origin-Auth";

        private readonly RequestDelegate _next;
        private readonly byte[]? _secret;

        public OriginAuthMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            var secret = configuration["ORIGIN_AUTH_SECRET"];
            _secret = string.IsNullOrWhiteSpace(secret) ? null : Encoding.UTF8.GetBytes(secret.Trim());
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (_secret == null)
            {
                await _next(context);
                return;
            }

            if (HasValidSecret(context.Request))
            {
                var cfIp = context.Request.Headers["CF-Connecting-IP"].ToString();
                if (cfIp.Length > 0 && IPAddress.TryParse(cfIp, out var clientIp))
                {
                    context.Connection.RemoteIpAddress = clientIp;
                }

                await _next(context);
                return;
            }

            if (IsExempt(context.Request))
            {
                await _next(context);
                return;
            }

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
        }

        private bool HasValidSecret(HttpRequest request)
        {
            var value = request.Headers[HeaderName].ToString();
            if (value.Length == 0) return false;
            return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(value), _secret);
        }

        /// <summary>
        /// Saglik kontrolu ve ic ag. Railway kenari Host'suz ya da baska bir Host'la gelen istegi bu
        /// servise yonlendiremez; bu muafiyetler disaridan kullanilamaz.
        /// </summary>
        private static bool IsExempt(HttpRequest request)
        {
            var path = request.Path.Value ?? "";
            if (path == "/health" || path == "/") return true;

            var host = request.Host.Host?.ToLowerInvariant() ?? "";
            return host.Length == 0
                || host == "localhost"
                || host == "127.0.0.1"
                || host == "healthcheck.railway.app"
                || host.EndsWith(".railway.internal", StringComparison.Ordinal);
        }
    }
}
