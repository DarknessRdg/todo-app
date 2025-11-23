import { useNavigate, useSearchParams } from "react-router";

export function useNavigation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const removeQueryParams = (...keys: string[]) => {
    const newParams = new URLSearchParams(searchParams);

    for (const key of keys) {
      newParams.delete(key);
    }

    navigate({
      pathname: window.location.pathname,
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
