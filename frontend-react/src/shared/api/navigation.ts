export const redirectToLogin = (url: string) => {
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/auth')
  ) {
    window.location.assign(url);
  }
};
