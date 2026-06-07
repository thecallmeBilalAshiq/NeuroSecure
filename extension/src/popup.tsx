import { useEffect } from "react";
import App from "./App";
import "./style.css";

function Popup(): JSX.Element {
  useEffect(() => {
    document.body.classList.add("ns-popup");
    return () => {
      document.body.classList.remove("ns-popup");
    };
  }, []);

  return (
    <div className="w-[400px] min-h-[600px] bg-white text-text-primary">
      <App variant="popup" />
    </div>
  );
}

export default Popup;
