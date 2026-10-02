import { ADMIN_PAGES } from "@/components/platform/AdminWorkspace";
export default function AdminPage({ section }) { const Page = ADMIN_PAGES[section]; return <Page />; }
export function getStaticPaths() { return { paths: Object.keys(ADMIN_PAGES).map(section => ({ params: { section } })), fallback: false }; }
export function getStaticProps({ params }) { return { props: { section: params.section } }; }
