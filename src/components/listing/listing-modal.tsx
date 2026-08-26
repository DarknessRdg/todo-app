import { TodoModalRoute } from "@/pages/inbox/todo-modal-route";

/**
 * The todo detail, opened over whatever list it was opened from.
 *
 * Part of the listing rather than something each page remembers to render:
 * rows navigate by search param, so a page that lists todos without this
 * changes the url and then shows nothing — which is exactly what the project
 * page used to do. Composition makes forgetting it impossible.
 */
export function ListingModal() {
  return <TodoModalRoute />;
}
