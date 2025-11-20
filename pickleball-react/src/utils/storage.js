import { COOKIE_NAME, COOKIE_MAX_AGE_DAYS } from './constants.js';

function setCookie(name, value, days) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax";
  } catch (e) { }
}

function getCookie(name) {
  const cname = name + "=";
  const parts = document.cookie.split(";");
  for (let c of parts) {
    c = c.trim();
    if (c.indexOf(cname) === 0) return decodeURIComponent(c.substring(cname.length));
  }
  return null;
}

function hasCookieSupport() {
  try {
    setCookie("__t", "1", 1);
    const v = getCookie("__t");
    setCookie("__t", "", -1);
    return v === "1";
  } catch (e) {
    return false;
  }
}

const cookiesOk = hasCookieSupport();

export const Storage = {
  save(state) {
    const json = JSON.stringify(state);
    try {
      if (cookiesOk) {
        setCookie(COOKIE_NAME, json, COOKIE_MAX_AGE_DAYS);
      } else {
        localStorage.setItem(COOKIE_NAME, json);
      }
    } catch (e) {
      console.error("Save failed:", e.message);
    }
  },
  load() {
    let raw = getCookie(COOKIE_NAME);
    if (!raw) {
      raw = localStorage.getItem(COOKIE_NAME);
    }
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },
  clear() {
    setCookie(COOKIE_NAME, "", -1);
    try {
      localStorage.removeItem(COOKIE_NAME);
    } catch (e) { }
  }
};

