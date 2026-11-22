import Image from "next/image";
import logoOnDark from "@core/assets/logo-horizontal-on-dark.png";
import logoOnLight from "@core/assets/logo-horizontal-on-light.png";
import { cn } from "@core/lib/utils";

type BrandLogoProps = {
    /** Height and spacing classes; width follows the image ratio. */
    className?: string;
    priority?: boolean;
};

/**
 * En buyuk kullanim h-7 (28 px) x 6,25 oran = 175 px. sizes olmadan next/image dosyanin kendi
 * genisligine (900) gore 1x/2x uretiyor, telefon w=1920 indiriyordu (Lighthouse image-delivery).
 */
const LOGO_SIZES = "176px";

/** Horizontal Pause Menu logo. Swaps the lettering colour with the active theme. */
export function BrandLogo({ className, priority = false }: BrandLogoProps) {
    return (
        <>
            <Image src={logoOnLight} alt="Pause Menu" sizes={LOGO_SIZES} priority={priority} className={cn("w-auto dark:hidden", className)} />
            <Image src={logoOnDark} alt="Pause Menu" sizes={LOGO_SIZES} priority={priority} className={cn("hidden w-auto dark:block", className)} />
        </>
    );
}
