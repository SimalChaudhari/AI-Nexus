import { useEffect, useRef } from 'react';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import {
  completeMembershipApplicationPaymentReturn,
  parseMembershipApplicationPaymentReturn,
  stripMembershipApplicationPaymentParams,
} from 'src/utils/membership-application-checkout';

// ----------------------------------------------------------------------

/**
 * Handles WooshPay return on /home after membership application billing.
 * Records payment in Salesforce, then redirects to eServices SSO.
 */
export function useMembershipApplicationPaymentReturn() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || handledRef.current) return;

    const parsed = parseMembershipApplicationPaymentReturn(window.location.search);
    if (!parsed.isSuccessReturn) return;

    handledRef.current = true;

    const run = async () => {
      try {
        const result = await completeMembershipApplicationPaymentReturn({
          sessionId: parsed.sessionId,
          applicationId: parsed.applicationId,
        });

        const cleanPath = `${window.location.pathname}${stripMembershipApplicationPaymentParams(
          window.location.search
        )}`;
        window.history.replaceState({}, '', cleanPath);

        if (!result?.navigated) {
          router.replace(result?.redirectTo || paths.learning);
        }
      } catch (err) {
        if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
          return;
        }
        handledRef.current = false;
        const message = encodeURIComponent(
          err instanceof Error ? err.message : 'Payment could not be confirmed.'
        );
        const cleanPath = `${window.location.pathname}${stripMembershipApplicationPaymentParams(
          window.location.search
        )}`;
        window.history.replaceState({}, '', cleanPath);
        router.replace(`${paths.auth.membership.application}?billing=1&paymentError=${message}`);
      }
    };

    run();
  }, [router]);
}
