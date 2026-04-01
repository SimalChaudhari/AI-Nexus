import Cookies from 'js-cookie';

export const setCookie = (key, value, expiresInDays = 1) => {
  Cookies.set(key, value, { expires: expiresInDays }); // expires in 7 days
};

export const getCookie = (key) => Cookies.get(key);

export const deleteCookie = (key) => {
  Cookies.remove(key);
};