import React from "react";

/* Minimal page transition wrapper without motion to keep UX simple */
function PageTransition({ children }) {
  return (
    <>
      <div className="page-transition" />
      <div>{children}</div>
    </>
  );
}

export default PageTransition;
