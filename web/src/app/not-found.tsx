import "twenty-ui/style.css";
import "twenty-ui/theme-light.css";
import "twenty-ui/theme-dark.css";
import "./lab/twenty/twenty.css";
import { navCounts } from "./lab/twenty/data";
import TwentyNotFound from "./lab/twenty/not-found";
import { TwentyShell } from "./lab/twenty/shell";

// Unknown URLs that no design's segment catches land here, outside the Twenty layout, so this brings
// the Twenty shell itself (pages inside lab/twenty use its own not-found).
export default function NotFound() {
  return (
    <TwentyShell counts={navCounts()}>
      <TwentyNotFound />
    </TwentyShell>
  );
}
