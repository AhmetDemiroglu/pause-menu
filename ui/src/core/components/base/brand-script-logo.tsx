import Image from "next/image";
import logoOnDark from "@core/assets/logo-primary-on-dark.png";
import logoOnLight from "@core/assets/logo-primary-on-light.png";
import { cn } from "@core/lib/utils";

type BrandScriptLogoProps = {
    /** Height classes; width follows the image ratio. */
    className?: string;
    /** "auto" follows the theme, "dark" forces cream lettering for dark surfaces, "light" forces ink lettering. */
    tone?: "auto" | "dark" | "light";
    priority?: boolean;
};

/**
 * En buyuk kullanim h-24 (96 px) x 2,48 oran = 238 px. sizes olmadan telefon w=1920 indiriyordu.
 */
const SCRIPT_LOGO_SIZES = "240px";

/** Main Pause Menu logo with the script "Menu". Used on promo cards and static pages. */
export function BrandScriptLogo({ className, tone = "auto", priority = false }: BrandScriptLogoProps) {
    if (tone === "dark") {
        return <Image src={logoOnDark} alt="Pause Menu" sizes={SCRIPT_LOGO_SIZES} priority={priority} className={cn("w-auto max-w-full object-contain", className)} />;
    }
    if (tone === "light") {
        return <Image src={logoOnLight} alt="Pause Menu" sizes={SCRIPT_LOGO_SIZES} priority={priority} className={cn("w-auto max-w-full object-contain", className)} />;
    }
    return (
        <>
            <Image src={logoOnLight} alt="Pause Menu" sizes={SCRIPT_LOGO_SIZES} priority={priority} className={cn("w-auto max-w-full object-contain dark:hidden", className)} />
            <Image src={logoOnDark} alt="Pause Menu" sizes={SCRIPT_LOGO_SIZES} priority={priority} className={cn("hidden w-auto dark:block", className)} />
        </>
    );
}
