import Link from "next/link";
import { IconBuildingSkyscraper, IconHome } from "./icons";
import { PageHead } from "./ui";
import { LightButton, MainButton, Text } from "./tw";

export default function NotFound() {
  return (
    <>
      <PageHead section="home" icon={IconHome} title="Not found" />
      <section className="tw-panel">
        <div className="tw-empty" style={{ display: "grid", gap: 12, justifyItems: "center", paddingTop: 96 }}>
          <Text size="xl" weight="semibold" color="primary">
            No lore here yet.
          </Text>
          <Text color="tertiary" style={{ maxWidth: 420 }}>
            This page isn’t in the archive. It may have moved, or the company hasn’t been researched yet. Press ⌘K to search.
          </Text>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <MainButton size="sm" startIcon={<IconBuildingSkyscraper />} render={<Link href="/companies" />} nativeButton={false}>
              All companies
            </MainButton>
            <LightButton size="sm" variant="outline" render={<Link href="/request" />} nativeButton={false}>
              Request a company
            </LightButton>
          </div>
        </div>
      </section>
    </>
  );
}
