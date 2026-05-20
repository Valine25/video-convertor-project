import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);

const SESSION_KEY = "cinepulse_session";
const TOKEN_KEY = "cinepulse_token";


// SAFE LOCALSTORAGE READER
function readJson(key, fallback) {

  try {

    const value = localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;

  } catch {

    return fallback;
  }
}


export function AuthProvider({ children }) {

  const [currentUser, setCurrentUser] = useState(
    () => readJson(SESSION_KEY, null)
  );


  // SAVE USER SESSION
  useEffect(() => {

    if (currentUser) {

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(currentUser)
      );

    } else {

      localStorage.removeItem(SESSION_KEY);
    }

  }, [currentUser]);


  const value = useMemo(
    () => ({

      currentUser,


      // =========================
      // REGISTER
      // =========================
      register: async ({
        fullName,
        email,
        password,
      }) => {

        try {

          const response = await fetch(
            "http://localhost:5001/api/auth/register",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                fullName,
                email,
                password,
              }),
            }
          );

          const data = await response.json();

          console.log(data);

          if (response.ok) {

            return {
              ok: true,
            };
          }

          return {
            ok: false,
            message:
              data.message || "Registration failed",
          };

        } catch (error) {

          console.log(error);

          return {
            ok: false,
            message: "Server Error",
          };
        }
      },


      // =========================
      // LOGIN
      // =========================
      login: async ({
        email,
        password,
      }) => {

        try {

          const response = await fetch(
            "http://localhost:5001/api/auth/login",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                email,
                password,
              }),
            }
          );

          const data = await response.json();

          console.log(data);

          // SUCCESS
          if (response.ok) {

            // SAVE TOKEN
            localStorage.setItem(
              TOKEN_KEY,
              data.token
            );

            // SAVE USER
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify(data.user)
            );

            // UPDATE STATE
            setCurrentUser(data.user);

            return {
              ok: true,
            };
          }

          // FAILED
          return {
            ok: false,
            message:
              data.message || "Login failed",
          };

        } catch (error) {

          console.log(error);

          return {
            ok: false,
            message: "Server Error",
          };
        }
      },


      // =========================
      // LOGOUT
      // =========================
      logout: () => {

        localStorage.removeItem(SESSION_KEY);

        localStorage.removeItem(TOKEN_KEY);

        setCurrentUser(null);
      },

    }),

    [currentUser]
  );


  return (

    <AuthContext.Provider value={value}>

      {children}

    </AuthContext.Provider>
  );
}


export function useAuth() {

  const context = useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}