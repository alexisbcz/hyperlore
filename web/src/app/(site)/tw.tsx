"use client";

// Twenty UI, re-exported through one client boundary. Server components can't dot into a client
// module (`Tabs.Root`), so compound parts are flattened here.

import { Card, Tooltip } from "twenty-ui/primitives/surfaces";
import { Tabs } from "twenty-ui/primitives/navigation";
import { Section } from "twenty-ui/components/layout";
import { Callout } from "twenty-ui/components/feedback";

export { Avatar, Badge, Chip, Status, Tag } from "twenty-ui/primitives/data-display";
export { Heading, Text, Shortcut, OverflowingTextWithTooltip } from "twenty-ui/primitives/typography";
export { Separator } from "twenty-ui/primitives/layout";
export { Breadcrumb } from "twenty-ui/primitives/navigation";
export { ProgressBar, Skeleton } from "twenty-ui/primitives/feedback";
export { AvatarGroup, DetailsRow, MetricRow, TintedIconTile } from "twenty-ui/components/data-display";
export { LightButton, LightIconButton, MainButton, IconButton, SegmentedControl } from "twenty-ui/components/input";
export { TabButton } from "twenty-ui/components/navigation";
export { OverflowingList } from "twenty-ui/components/layout";
export { Callout, Tooltip };

export const CardRoot = Card.Root;
export const CardHeader = Card.Header;
export const CardContent = Card.Content;
export const CardFooter = Card.Footer;

export const TabsRoot = Tabs.Root;
export const TabsList = Tabs.List;
export const TabsTab = Tabs.Tab;
export const TabsIndicator = Tabs.Indicator;
export const TabsPanel = Tabs.Panel;

export const SectionRoot = Section.Root;
export const SectionHeader = Section.Header;
