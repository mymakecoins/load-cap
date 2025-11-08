export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "GTeam";

export const APP_LOGO = import.meta.env.VITE_APP_LOGO || "/logo.jpeg";

// Login URL para autenticação local
export const getLoginUrl = () => {
  return "/login";
};