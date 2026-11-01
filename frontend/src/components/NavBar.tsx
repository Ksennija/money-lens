import { NavLink } from "react-router-dom";

// NavLink sets aria-current="page" on the link for the current URL.
export default function NavBar() {
  return (
    <nav aria-label="Main">
      <NavLink to="/" end>
        Home
      </NavLink>
      <NavLink to="/signup">Sign up</NavLink>
      <NavLink to="/signin">Sign in</NavLink>
    </nav>
  );
}
