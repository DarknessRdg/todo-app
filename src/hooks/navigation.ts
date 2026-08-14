import { useLocation, useNavigate, useSearchParams } from "react-router";

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const removeQueryParams = (...keys: string[]) => {
    const newParams = new URLSearchParams(searchParams);

    for (const key of keys) {
      newParams.delete(key);
    }

    // The router's path, not the browser's. Where the app is *served* from is
    // the router's basename — `/todo-app/` on GitHub Pages — and it puts that
    // back on the front of whatever it is handed. `window.location.pathname`
    // already carries it, so passing that made the router prefix a path that
    // was prefixed already: `/todo-app` navigated to `/todo-app/todo-app`, and
    // closing a todo left the app entirely. `useLocation` reports the path
    // with the basename stripped, which is the form `navigate` expects.
    navigate({
      pathname: location.pathname,
      search: newParams.toString(),
    });
  };

  const back = () => navigate(-1);

  return {
    to: navigate,
    back,
    removeQueryParms: removeQueryParams,
    searchParams,
  };
}
