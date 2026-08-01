import { useEffect } from 'react';
import { trackActivity } from '../lib/activity';

/** Fires page_view on mount (VetPet-style). */
export default function ActivityTracker({ userProfile }) {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    trackActivity('page_view', {
      path,
      userId: userProfile?.id || null,
      userName: userProfile?.name || null,
    });
  }, [userProfile?.id, userProfile?.name]);

  return null;
}
