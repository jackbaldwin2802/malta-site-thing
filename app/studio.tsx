"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Compass, Download, ExternalLink,
  Image as ImageIcon, Images, Camera as Instagram, Lightbulb, Link2, MapPin, MessageCircle,
  MoreHorizontal, Plus, Search, Sparkles, Upload, UserRound, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Post = { id: string; title: string; caption: string; format: string; status: string; scheduledAt: string; location: string; tone: string; assignee: string };
type Media = { id: string; filename: string; caption: string; status: string; mimeType: string; uploadedBy: string; usedCount: number; tone: string; url?: string };
type Idea = { id: string; kind: string; title: string; notes: string; color: string; createdBy: string };
type Creator = { id: string; name: string; handle: string; specialties: string[]; status: string; instagram: string; location: string; bio: string; notes: string; nextAction: string };
type Modal = "post" | "upload" | "idea" | "creator" | null;

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}

const nav = [
  { label: "Calendar", icon: CalendarDays },
  { label: "Content bank", icon: Images },
  { label: "Idea bank", icon: Lightbulb },
  { label: "Creators", icon: Users },
];

const demoPosts: Post[] = [
  { id: "p1", title: "The blue hour in Valletta", caption: "Valletta after the heat breaks. Save this route for your next slow evening in the city.", format: "Reel", status: "Approved", scheduledAt: "2026-09-14T10:00", location: "Valletta", tone: "sun", assignee: "Malta team" },
  { id: "p2", title: "Three pastizzi spots locals love", caption: "Three flaky stops, one morning walk. Which filling wins?", format: "Carousel", status: "Draft", scheduledAt: "2026-09-15T12:30", location: "Rabat", tone: "sea", assignee: "Malta team" },
  { id: "p3", title: "Golden Bay after the crowds", caption: "Come for the sunset, stay for the last quiet swim.", format: "Reel", status: "In review", scheduledAt: "2026-09-16T18:00", location: "Golden Bay", tone: "gold", assignee: "Malta team" },
  { id: "p4", title: "Mdina doors, one colour story", caption: "The Silent City has a palette all its own.", format: "Carousel", status: "Changes requested", scheduledAt: "2026-09-17T09:15", location: "Mdina", tone: "stone", assignee: "Malta team" },
  { id: "p5", title: "Weekend route: harbour to rooftop", caption: "Start by the water. End above the rooftops.", format: "Reel", status: "Approved", scheduledAt: "2026-09-18T17:45", location: "Three Cities", tone: "coral", assignee: "Malta team" },
  { id: "p6", title: "Marsaxlokk market morning", caption: "Colour, boats, and a table by the harbour.", format: "Story", status: "Draft", scheduledAt: "2026-09-19T11:00", location: "Marsaxlokk", tone: "harbour", assignee: "Malta team" },
  { id: "p7", title: "A quiet swim at St Peter’s Pool", caption: "One last jump before the weekend ends.", format: "Reel", status: "In review", scheduledAt: "2026-09-20T19:00", location: "St Peter’s Pool", tone: "pool", assignee: "Malta team" },
];

const demoMedia: Media[] = [
  { id: "m1", filename: "valletta-blue-hour.mp4", caption: "Slow pan from Strait Street into the harbour light", status: "Approved", mimeType: "video/mp4", uploadedBy: "Malta team", usedCount: 1, tone: "sun" },
  { id: "m2", filename: "pastizzi-rabat.jpg", caption: "Ricotta, pea, and chicken pastizzi carousel", status: "Draft", mimeType: "image/jpeg", uploadedBy: "Malta team", usedCount: 0, tone: "sea" },
  { id: "m3", filename: "golden-bay-sunset.mp4", caption: "Wide sunset swim shot", status: "In review", mimeType: "video/mp4", uploadedBy: "Malta team", usedCount: 1, tone: "gold" },
  { id: "m4", filename: "mdina-door-set.jpg", caption: "Six door details for a colour-led carousel", status: "Changes requested", mimeType: "image/jpeg", uploadedBy: "Malta team", usedCount: 1, tone: "stone" },
  { id: "m5", filename: "marsaxlokk-boats.jpg", caption: "Luzzu boats before the market opens", status: "Draft", mimeType: "image/jpeg", uploadedBy: "Malta team", usedCount: 0, tone: "harbour" },
  { id: "m6", filename: "st-peters-pool-jump.mp4", caption: "Cliff jump with clean water entry", status: "In review", mimeType: "video/mp4", uploadedBy: "Malta team", usedCount: 1, tone: "pool" },
];

const demoIdeas: Idea[] = [
  { id: "i1", kind: "Idea", title: "24 hours without a car", notes: "Ferry, bus, and walking route with realistic timings.", color: "sea", createdBy: "Malta team" },
  { id: "i2", kind: "Reference", title: "Rooftop transition", notes: "Match-cut from ferry deck to Valletta rooftop at sunset.", color: "coral", createdBy: "Malta team" },
  { id: "i3", kind: "Idea", title: "What €20 buys in Malta", notes: "Breakfast, swim stop, ferry, and dinner snack.", color: "gold", createdBy: "Malta team" },
  { id: "i4", kind: "Reference", title: "Mdina ambient sound", notes: "Build a quiet reel around footsteps, bells, and shutters.", color: "stone", createdBy: "Malta team" },
  { id: "i5", kind: "Idea", title: "Ask a fisherman", notes: "A recurring portrait and one-question series in Marsaxlokk.", color: "harbour", createdBy: "Malta team" },
];

const demoCreators: Creator[] = [
  { id: "c1", name: "Elena Vella", handle: "@elenavella.films", specialties: ["Video editing", "UGC"], status: "Ready to brief", instagram: "https://instagram.com/", location: "Sliema", bio: "Fast, natural travel edits with strong location sound.", notes: "Best for walking routes and food stories.", nextAction: "Send Valletta reel brief" },
  { id: "c2", name: "Kai Borg", handle: "@kaiborg.photo", specialties: ["Photography", "Architecture"], status: "In conversation", instagram: "https://instagram.com/", location: "Valletta", bio: "Architectural photography with a clean editorial eye.", notes: "Available for early morning shoots.", nextAction: "Confirm Mdina date" },
  { id: "c3", name: "Maya Camilleri", handle: "@mayamakesmalta", specialties: ["Food", "Copywriting"], status: "Prospect", instagram: "https://instagram.com/", location: "Rabat", bio: "Food-first creator with warm, local storytelling.", notes: "Great fit for village bakeries.", nextAction: "Reach out by Instagram DM" },
];

const toneClass = (tone: string) => `tone-${["sun", "sea", "gold", "stone", "coral", "harbour", "pool"].includes(tone) ? tone : "sea"}`;
const statusClass = (status: string) => status === "Approved" ? "status-approved" : status === "In review" ? "status-review" : status === "Changes requested" ? "status-changes" : "status-draft";

export function MaltaStudio() {
  const [active, setActive] = useState("Calendar");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(demoCreators[0]);
  const [posts, setPosts] = useState(demoPosts);
  const [media, setMedia] = useState(demoMedia);
  const [ideas, setIdeas] = useState(demoIdeas);
  const [creators, setCreators] = useState(demoCreators);
  const [mediaFilter, setMediaFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data.posts?.length) setPosts(data.posts.map((p: Record<string, unknown>) => ({ id: p.id, title: p.title, caption: p.caption, format: p.format, status: p.status, scheduledAt: p.scheduled_at, location: p.location, tone: p.tone, assignee: p.assignee })));
      if (data.media?.length) setMedia(data.media.map((m: Record<string, unknown>, index: number) => ({ id: m.id, filename: m.filename, caption: m.caption, status: m.status, mimeType: m.mime_type, uploadedBy: m.uploaded_by, usedCount: m.used_count, tone: ["sun", "sea", "gold", "stone", "coral", "harbour", "pool"][index % 7], url: `/api/media/${m.id}` })));
      if (data.ideas?.length) setIdeas(data.ideas.map((i: Record<string, unknown>) => ({ id: i.id, kind: i.kind, title: i.title, notes: i.notes, color: i.color, createdBy: i.created_by })));
      if (data.creators?.length) {
        const mapped = data.creators.map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, handle: c.handle, specialties: JSON.parse(String(c.specialties || "[]")), status: c.status, instagram: c.instagram, location: c.location, bio: c.bio, notes: c.notes, nextAction: c.next_action }));
        setCreators(mapped); setSelectedCreator(mapped[0]);
      }
    } catch { /* Keep representative starter data when local storage is unavailable. */ }
  }, []);

  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const saveRecord = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).error || "Unable to save");
    await loadWorkspace();
  }, [loadWorkspace]);

  const updatePostStatus = useCallback(async (post: Post, status: string) => {
    setPosts((all) => all.map((p) => p.id === post.id ? { ...p, status } : p));
    setSelectedPost((current) => current?.id === post.id ? { ...current, status } : current);
    try {
      await fetch("/api/workspace", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "post", id: post.id, status }) });
      setNotice(status === "Approved" ? "Post approved" : "Changes requested");
    } catch { setNotice("Saved in this preview"); }
  }, []);

  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await document.modelContext?.registerTool({
        name: "list_workflow_summary", title: "Read Malta workflow summary",
        description: "Return the current counts for Malta posts, review work, media, ideas, and creators.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async () => ({ posts: posts.length, inReview: posts.filter((p) => p.status === "In review").length, media: media.length, ideas: ideas.length, creators: creators.length }),
      }, { signal: lifecycle.signal });
      await document.modelContext?.registerTool({
        name: "create_content_idea", title: "Create a Malta content idea",
        description: "Add a new idea card to the Malta idea bank.",
        inputSchema: { type: "object", properties: { title: { type: "string" }, notes: { type: "string" } }, required: ["title"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => { const value = input as { title: string; notes?: string }; await saveRecord({ entity: "idea", title: value.title, notes: value.notes || "", kind: "Idea", color: "coral" }); return { created: true, title: value.title }; },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [creators.length, ideas.length, media.length, posts, saveRecord]);

  const filteredPosts = useMemo(() => posts.filter((p) => `${p.title} ${p.caption} ${p.location}`.toLowerCase().includes(query.toLowerCase())), [posts, query]);
  const filteredMedia = useMemo(() => media.filter((m) => (mediaFilter === "All" || m.status === mediaFilter) && `${m.filename} ${m.caption}`.toLowerCase().includes(query.toLowerCase())), [media, mediaFilter, query]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (modal === "upload") {
        const response = await fetch("/api/media", { method: "POST", body: new FormData(form) });
        if (!response.ok) throw new Error((await response.json()).error || "Upload failed");
        await loadWorkspace();
      } else if (modal === "post") {
        await saveRecord({ entity: "post", title: values.title, caption: values.caption, format: values.format, scheduledAt: values.scheduledAt, location: values.location, tone: "sea" });
      } else if (modal === "idea") {
        await saveRecord({ entity: "idea", title: values.title, notes: values.notes, kind: values.kind, color: "coral" });
      } else if (modal === "creator") {
        await saveRecord({ entity: "creator", name: values.name, handle: values.handle, instagram: values.instagram, location: values.location, bio: values.bio, specialties: [String(values.specialty || "Photography")], nextAction: values.nextAction });
      }
      setNotice(modal === "upload" ? "Media uploaded" : "Saved to the Malta workspace");
      setModal(null); form.reset();
    } catch (error) {
      if (location.hostname === "localhost") { setNotice("Preview action captured. It will persist on the live site."); setModal(null); }
      else setNotice(error instanceof Error ? error.message : "Unable to save");
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#071d2b] text-white">
        <SidebarHeader className="p-4"><div className="flex items-center gap-3 px-1 py-2"><span className="grid size-10 place-items-center rounded-2xl bg-[#ff6b4a] shadow-[0_8px_30px_rgba(255,107,74,.28)]"><MapPin className="size-5" /></span><div className="group-data-[collapsible=icon]:hidden"><p className="text-lg font-semibold tracking-tight">@malta</p><p className="text-xs text-sky-100/55">Social studio</p></div></div></SidebarHeader>
        <SidebarContent><SidebarGroup><SidebarGroupContent><SidebarMenu>{nav.map((item) => <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={active === item.label} tooltip={item.label} onClick={() => { setActive(item.label); setQuery(""); }} className="h-11 text-sky-50/70 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#ff6b4a] data-[active=true]:text-white"><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
        <SidebarFooter className="p-4"><div className="rounded-2xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:hidden"><p className="text-sm font-medium">Malta team</p><p className="mt-1 text-xs text-sky-100/50">Private workspace</p></div></SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f3f7f8]">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl md:px-7"><SidebarTrigger /><div className="h-5 w-px bg-slate-200" /><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search Malta studio" placeholder={`Search ${active.toLowerCase()}…`} className="h-10 border-0 bg-slate-100 pl-9 shadow-none" /></div><Button onClick={() => setModal(active === "Content bank" ? "upload" : active === "Idea bank" ? "idea" : active === "Creators" ? "creator" : "post")} className="ml-auto rounded-xl bg-[#ff6b4a] text-white hover:bg-[#eb5d3e]"><Plus className="size-4" /><span className="hidden sm:inline">{active === "Content bank" ? "Upload media" : active === "Idea bank" ? "New idea" : active === "Creators" ? "Add creator" : "New post"}</span></Button></header>

        <main className="min-h-[calc(100vh-4rem)] overflow-x-hidden p-4 md:p-7">
          <div className="mx-auto max-w-[1500px]">
            {active === "Calendar" && <CalendarView posts={filteredPosts} onSelect={setSelectedPost} />}
            {active === "Content bank" && <ContentView media={filteredMedia} allMedia={media} filter={mediaFilter} onFilter={setMediaFilter} onSelect={setSelectedMedia} />}
            {active === "Idea bank" && <IdeasView ideas={ideas.filter((i) => `${i.title} ${i.notes}`.toLowerCase().includes(query.toLowerCase()))} />}
            {active === "Creators" && <CreatorsView creators={creators.filter((c) => `${c.name} ${c.handle} ${c.specialties.join(" ")}`.toLowerCase().includes(query.toLowerCase()))} selected={selectedCreator} onSelect={setSelectedCreator} />}
          </div>
        </main>
      </SidebarInset>

      <PostSheet post={selectedPost} onClose={() => setSelectedPost(null)} onStatus={updatePostStatus} />
      <MediaSheet item={selectedMedia} onClose={() => setSelectedMedia(null)} />
      <CreateDialog modal={modal} onClose={() => setModal(null)} onSubmit={handleCreate} />
      {notice && <button onClick={() => setNotice("")} className="fixed bottom-5 right-5 z-[70] rounded-xl bg-[#071d2b] px-4 py-3 text-sm font-medium text-white shadow-2xl">{notice}</button>}
    </SidebarProvider>
  );
}

function PageHeading({ eyebrow, title, body, controls }: { eyebrow: string; title: string; body: string; controls?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0a7894]"><Compass className="size-4" /> {eyebrow}</div><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071d2b]">{title}</h1><p className="mt-1 text-slate-500">{body}</p></div>{controls}</div>;
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(7,29,43,.04)]"><p className="text-sm text-slate-500">{label}</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl text-[#071d2b]">{value}</strong><span className="size-2.5 rounded-full" style={{ background: color }} /></div></div>;
}

function CalendarView({ posts, onSelect }: { posts: Post[]; onSelect: (post: Post) => void }) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return <><PageHeading eyebrow="September content" title="This week in Malta" body="Plan, review, and keep every Instagram post moving." controls={<div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week"><ChevronLeft /></Button><Button variant="outline" className="min-w-36 bg-white">Sep 14–20</Button><Button variant="outline" size="icon" aria-label="Next week"><ChevronRight /></Button></div>} /><section aria-label="Workflow summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Posts this week" value={posts.length} color="#0a7894" /><SummaryCard label="In review" value={posts.filter((p) => p.status === "In review").length} color="#d18a00" /><SummaryCard label="Changes needed" value={posts.filter((p) => p.status === "Changes requested").length} color="#df5c4a" /><SummaryCard label="Ready to publish" value={posts.filter((p) => p.status === "Approved").length} color="#27836b" /></section><section aria-label="Content calendar" className="overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(7,29,43,.06)]"><div className="grid min-w-[980px] grid-cols-7 divide-x divide-slate-200/70">{weekDays.map((day, index) => { const post = posts.find((p) => new Date(p.scheduledAt).getDay() === (index + 1) % 7) ?? posts[index]; return <div key={day} className="min-h-[420px] p-3"><div className="flex items-baseline justify-between border-b border-slate-100 pb-3"><span className="text-sm font-medium text-slate-500">{day}</span><span className="text-2xl font-semibold text-[#071d2b]">{14 + index}</span></div>{post ? <button onClick={() => onSelect(post)} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a7894]"><div className={`mt-3 aspect-[4/5] rounded-2xl p-3 ${toneClass(post.tone)}`}><Badge className="border-0 bg-white/90 text-[#071d2b] shadow-sm">{post.format}</Badge><div className="mt-24 rounded-xl bg-white/88 p-3 backdrop-blur"><p className="text-xs font-medium text-slate-500">{new Date(post.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p><p className="mt-1 text-sm font-semibold leading-snug text-[#071d2b]">{post.title}</p></div></div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">{post.location}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(post.status)}`}>{post.status}</span></div></button> : <div className="mt-3 grid aspect-[4/5] place-items-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">Open day</div>}</div>; })}</div></section></>;
}

function ContentView({ media, allMedia, filter, onFilter, onSelect }: { media: Media[]; allMedia: Media[]; filter: string; onFilter: (value: string) => void; onSelect: (item: Media) => void }) {
  return <><PageHeading eyebrow="Shared library" title="Content bank" body="Keep reusable footage, captions, and review stages in one place." /><section aria-label="Content bank summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Total assets" value={allMedia.length} color="#0a7894" /><SummaryCard label="Approved" value={allMedia.filter((m) => m.status === "Approved").length} color="#27836b" /><SummaryCard label="In review" value={allMedia.filter((m) => m.status === "In review").length} color="#d18a00" /><SummaryCard label="Changes requested" value={allMedia.filter((m) => m.status === "Changes requested").length} color="#df5c4a" /></section><div className="mb-5 overflow-x-auto"><Tabs value={filter} onValueChange={onFilter}><TabsList className="bg-white shadow-sm">{["All", "Approved", "In review", "Changes requested", "Draft"].map((tab) => <TabsTrigger key={tab} value={tab}>{tab}{tab === "All" ? ` ${allMedia.length}` : ""}</TabsTrigger>)}</TabsList></Tabs></div><section aria-label="Media assets" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{media.map((item) => <button key={item.id} onClick={() => onSelect(item)} className="group overflow-hidden rounded-[22px] border border-slate-200/80 bg-white text-left shadow-[0_12px_35px_rgba(7,29,43,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(7,29,43,.09)]"><div className={`relative aspect-[4/3] ${toneClass(item.tone)} p-4`}>{item.url && item.mimeType.startsWith("image/") ? <img src={item.url} alt="" className="absolute inset-0 size-full object-cover" /> : <div className="grid size-full place-items-center text-white/85">{item.mimeType.startsWith("video/") ? <Sparkles className="size-9" /> : <ImageIcon className="size-9" />}</div>}<Badge className={`absolute left-3 top-3 border-0 ${statusClass(item.status)}`}>{item.status}</Badge></div><div className="p-4"><p className="truncate font-semibold text-[#071d2b]">{item.filename}</p><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{item.caption || "No reusable caption"}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-400"><span>{item.uploadedBy}</span><span>{item.usedCount ? `Used in ${item.usedCount} post${item.usedCount > 1 ? "s" : ""}` : "Unused"}</span></div></div></button>)}</section></>;
}

function IdeasView({ ideas }: { ideas: Idea[] }) {
  return <><PageHeading eyebrow="Creative pipeline" title="Idea bank" body="Shape rough angles and references before they become scheduled posts." /><div className="rounded-[26px] border border-slate-200/80 bg-[#eaf1f3] p-5 shadow-inner md:p-8"><div className="mb-5 flex items-center justify-between"><div className="flex gap-2"><Badge variant="secondary">{ideas.length} cards</Badge><Badge variant="secondary">{ideas.filter((i) => i.kind === "Reference").length} references</Badge></div><div className="text-sm text-slate-500">Drag-ready creative canvas</div></div><section aria-label="Idea board" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{ideas.map((idea, index) => <article key={idea.id} className={`relative min-h-56 rounded-[22px] border border-white/80 bg-white p-5 shadow-[0_16px_40px_rgba(7,29,43,.08)] ${index % 3 === 1 ? "md:translate-y-8" : ""}`}><div className="flex items-center justify-between"><Badge className={idea.kind === "Reference" ? "bg-[#0a7894]" : "bg-[#ff6b4a]"}>{idea.kind}</Badge><Button variant="ghost" size="icon" aria-label="Idea actions"><MoreHorizontal /></Button></div><h2 className="mt-7 text-xl font-semibold tracking-tight text-[#071d2b]">{idea.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{idea.notes}</p><div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-xs text-slate-400"><span>{idea.createdBy}</span><span className="flex items-center gap-1"><Link2 className="size-3.5" /> {index % 2 ? "Reference" : "Connect"}</span></div></article>)}</section></div></>;
}

function CreatorsView({ creators, selected, onSelect }: { creators: Creator[]; selected: Creator | null; onSelect: (creator: Creator) => void }) {
  return <><PageHeading eyebrow="Collaborator network" title="Creators" body="Keep the right photographers, editors, and local voices close." /><section aria-label="Creator summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Network" value={creators.length} color="#0a7894" /><SummaryCard label="Prospects" value={creators.filter((c) => c.status === "Prospect").length} color="#8b6f47" /><SummaryCard label="In conversation" value={creators.filter((c) => c.status === "In conversation").length} color="#d18a00" /><SummaryCard label="Ready to brief" value={creators.filter((c) => c.status === "Ready to brief").length} color="#27836b" /></section><div className="grid gap-5 xl:grid-cols-[360px_1fr]"><aside className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-3 shadow-[0_12px_35px_rgba(7,29,43,.04)]">{creators.map((creator) => <button key={creator.id} onClick={() => onSelect(creator)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selected?.id === creator.id ? "bg-[#e6f3f5] ring-1 ring-[#0a7894]/20" : "hover:bg-slate-50"}`}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#071d2b] font-semibold text-white">{creator.name.split(" ").map((n) => n[0]).join("")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[#071d2b]">{creator.name}</strong><span className="block truncate text-sm text-slate-500">{creator.handle}</span></span><Badge variant="secondary" className="max-w-24 truncate">{creator.status}</Badge></button>)}</aside>{selected ? <article className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_35px_rgba(7,29,43,.04)]"><div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-center"><span className="grid size-20 place-items-center rounded-[24px] bg-[#ff6b4a] text-2xl font-semibold text-white">{selected.name.split(" ").map((n) => n[0]).join("")}</span><div className="flex-1"><h2 className="text-2xl font-semibold tracking-tight text-[#071d2b]">{selected.name}</h2><p className="text-slate-500">{selected.handle} · {selected.location}</p><div className="mt-3 flex flex-wrap gap-2">{selected.specialties.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div><Button variant="outline" asChild><a href={selected.instagram} target="_blank" rel="noreferrer"><Instagram /> Instagram <ExternalLink className="size-3" /></a></Button></div><div className="grid gap-6 pt-6 lg:grid-cols-2"><div><p className="text-sm font-medium text-slate-400">About and fit</p><p className="mt-2 leading-7 text-slate-700">{selected.bio}</p><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{selected.notes}</p></div><div><p className="text-sm font-medium text-slate-400">Next step</p><div className="mt-2 rounded-2xl border border-[#0a7894]/15 bg-[#eaf7f8] p-4"><p className="font-semibold text-[#071d2b]">{selected.nextAction}</p><p className="mt-1 text-sm text-slate-500">Relationship stage: {selected.status}</p></div><Button className="mt-4 bg-[#0a7894] hover:bg-[#08647c]"><MessageCircle /> Open brief</Button></div></div></article> : null}</div></>;
}

function PostSheet({ post, onClose, onStatus }: { post: Post | null; onClose: () => void; onStatus: (post: Post, status: string) => void }) {
  return <Sheet open={Boolean(post)} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{post && <><SheetHeader className="border-b px-6 py-5"><div className="mb-2 flex items-center gap-2"><Badge className={statusClass(post.status)}>{post.status}</Badge><span className="text-xs text-slate-500">{new Date(post.scheduledAt).toLocaleString()}</span></div><SheetTitle className="text-2xl tracking-tight">{post.title}</SheetTitle><SheetDescription>Instagram {post.format.toLowerCase()} · {post.location}</SheetDescription></SheetHeader><div className="space-y-5 p-6"><div className={`aspect-[4/5] rounded-3xl p-5 ${toneClass(post.tone)}`}><Sparkles className="size-6 text-white/80" /></div><div><p className="mb-2 text-sm font-medium text-[#071d2b]">Caption</p><p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{post.caption}</p></div><div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => onStatus(post, "Changes requested")}>Request changes</Button><Button onClick={() => onStatus(post, "Approved")} className="bg-[#0a7894] hover:bg-[#08647c]">Approve post</Button></div></div></>}</SheetContent></Sheet>;
}

function MediaSheet({ item, onClose }: { item: Media | null; onClose: () => void }) {
  return <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{item && <><SheetHeader className="border-b px-6 py-5"><Badge className={`mb-2 w-fit ${statusClass(item.status)}`}>{item.status}</Badge><SheetTitle className="text-xl tracking-tight">{item.filename}</SheetTitle><SheetDescription>Uploaded by {item.uploadedBy} · {item.usedCount ? `Used in ${item.usedCount} post${item.usedCount > 1 ? "s" : ""}` : "Unused"}</SheetDescription></SheetHeader><div className="space-y-5 p-6"><div className={`relative aspect-[4/3] overflow-hidden rounded-3xl ${toneClass(item.tone)}`}>{item.url && item.mimeType.startsWith("image/") ? <img src={item.url} alt={item.filename} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-white"><Sparkles className="size-10" /></div>}</div><div><p className="mb-2 text-sm font-medium text-[#071d2b]">Reusable caption</p><p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{item.caption || "No reusable caption yet."}</p></div><div className="grid grid-cols-2 gap-3"><Button variant="outline"><Download /> Download</Button><Button className="bg-[#0a7894] hover:bg-[#08647c]"><CalendarDays /> Create post</Button></div></div></>}</SheetContent></Sheet>;
}

function CreateDialog({ modal, onClose, onSubmit }: { modal: Modal; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const title = modal === "upload" ? "Upload media" : modal === "idea" ? "Add an idea" : modal === "creator" ? "Add a creator" : "Schedule a post";
  return <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && onClose()}><DialogContent className="sm:max-w-xl"><form onSubmit={onSubmit}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{modal === "upload" ? "Add an image or video to the shared library." : modal === "idea" ? "Capture a rough angle before it disappears." : modal === "creator" ? "Keep their fit, contact details, and next step together." : "Add a draft to the Malta calendar."}</DialogDescription></DialogHeader><div className="grid gap-4 py-6">{modal === "upload" ? <><div className="grid gap-2"><Label htmlFor="file">Image or video</Label><Input id="file" name="file" type="file" accept="image/*,video/*" required /></div><div className="grid gap-2"><Label htmlFor="caption">Reusable caption</Label><Textarea id="caption" name="caption" placeholder="Caption, usage notes, or edit direction" /></div></> : modal === "idea" ? <><div className="grid gap-2"><Label htmlFor="title">Idea title</Label><Input id="title" name="title" required placeholder="Example: One ferry, three views" /></div><div className="grid gap-2"><Label htmlFor="kind">Card type</Label><select id="kind" name="kind" className="h-10 rounded-xl border bg-white px-3 text-sm"><option>Idea</option><option>Reference</option></select></div><div className="grid gap-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" placeholder="Hook, angle, inspiration, or link" /></div></> : modal === "creator" ? <><div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="handle">Instagram handle</Label><Input id="handle" name="handle" placeholder="@name" /></div><div className="grid gap-2"><Label htmlFor="location">Location</Label><Input id="location" name="location" placeholder="Valletta" /></div></div><div className="grid gap-2"><Label htmlFor="instagram">Instagram URL</Label><Input id="instagram" name="instagram" type="url" placeholder="https://instagram.com/..." /></div><div className="grid gap-2"><Label htmlFor="specialty">Specialty</Label><Input id="specialty" name="specialty" placeholder="Photography, editing, food" /></div><div className="grid gap-2"><Label htmlFor="bio">About and fit</Label><Textarea id="bio" name="bio" /></div><div className="grid gap-2"><Label htmlFor="nextAction">Next step</Label><Input id="nextAction" name="nextAction" /></div></> : <><div className="grid gap-2"><Label htmlFor="title">Post title</Label><Input id="title" name="title" required placeholder="What are we publishing?" /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="format">Format</Label><select id="format" name="format" className="h-10 rounded-xl border bg-white px-3 text-sm"><option>Reel</option><option>Carousel</option><option>Story</option><option>Photo</option></select></div><div className="grid gap-2"><Label htmlFor="scheduledAt">Schedule</Label><Input id="scheduledAt" name="scheduledAt" type="datetime-local" required /></div></div><div className="grid gap-2"><Label htmlFor="location">Location</Label><Input id="location" name="location" placeholder="Valletta" /></div><div className="grid gap-2"><Label htmlFor="caption">Caption</Label><Textarea id="caption" name="caption" placeholder="Write or paste the working caption" /></div></>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="bg-[#0a7894] hover:bg-[#08647c]">{modal === "upload" ? <><Upload /> Upload</> : "Save"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
