import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function Documentation() {
  return (
    <div style={{ height: "100vh" }}>
      <SwaggerUI url="../../../public/documentation/swagger.json" />
    </div>
  );
}

export default Documentation;
