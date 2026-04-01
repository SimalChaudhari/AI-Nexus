import { useState, useEffect, useMemo, useCallback } from 'react';
import { userService } from 'src/services/user.service';

// ----------------------------------------------------------------------

export function useGetUser(userId) {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      setUserLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const userData = await userService.getUserById(userId);
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUserError(error);
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [userId, refreshKey]);

  return useMemo(
    () => ({
      user,
      userLoading,
      userError,
      userValidating: false,
      refresh,
    }),
    [user, userLoading, userError, refresh]
  );
}

// Hook for getting user profile (User role)
export function useGetUserProfile(enabled = true) {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUserLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const userData = await userService.getUserProfile();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserError(error);
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [enabled, refreshKey]);

  return useMemo(
    () => ({
      user,
      userLoading,
      userError,
      userValidating: false,
      refresh,
    }),
    [user, userLoading, userError, refresh]
  );
}

// Hook for getting admin profile (Admin role)
export function useGetAdminProfile(enabled = true) {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUserLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const userData = await userService.getAdminProfile();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        setUserError(error);
        setUser(null);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, [enabled, refreshKey]);

  return useMemo(
    () => ({
      user,
      userLoading,
      userError,
      userValidating: false,
      refresh,
    }),
    [user, userLoading, userError, refresh]
  );
}

