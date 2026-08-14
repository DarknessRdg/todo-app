import { BrowserRouter } from "react-router";
import { AppRoutes } from "./router";

/**
 * Where the app is mounted, told to the router rather than assumed.
 *
 * `BASE_URL` is `/` in dev and `/todo-app/` in the build — a GitHub Pages
 * project site is served under the repository name — so without this every
 * route would be matched against a path that still carries that prefix, and
 * nothing but the index would resolve. The trailing slash is trimmed so the
 * basename is a plain prefix, which is the form react-router documents.
 */
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <AppRoutes />
    </BrowserRouter>
  );
}
