import "twenty-ui/style.css";
import "twenty-ui/theme-light.css";
import "twenty-ui/theme-dark.css";
import "./(site)/twenty.css";
import { navCounts } from "./(site)/data";
import TwentyNotFound from "./(site)/not-found";
import { TwentyShell } from "./(site)/shell";

// Unknown URLs that no design's segment catches land here, outside the Twenty layout, so this brings
// the Twenty shell itself (pages inside (site) use its own not-found).
export default function NotFound() {
  return (
    <TwentyShell counts={navCounts()}>
      <TwentyNotFound />
    </TwentyShell>
  );
}
