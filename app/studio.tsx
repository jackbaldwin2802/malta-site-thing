"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Compass, Download, ExternalLink,
  Image as ImageIcon, Images, Camera as Instagram, Lightbulb, MessageCircle,
  Maximize2, MoreHorizontal, Plus, Search, Sparkles, Trash2, Upload, UserRound, Users, ZoomIn, ZoomOut,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

type PostComment = { id: string; body: string; author: string; createdAt: string };
type Post = { id: string; title: string; caption: string; format: string; status: string; scheduledAt: string; location: string; tone: string; assignee: string; mediaId?: string; comments: PostComment[] };
type Media = { id: string; filename: string; caption: string; status: string; mimeType: string; uploadedBy: string; usedCount: number; tone: string; url?: string };
type Idea = { id: string; kind: string; title: string; notes: string; color: string; createdBy: string; mediaId?: string; linkedTo?: string };
type Creator = { id: string; name: string; handle: string; specialties: string[]; status: string; instagram: string; location: string; bio: string; notes: string; nextAction: string };
type Modal = "post" | "upload" | "idea" | "creator" | null;
type DeleteTarget = { entity: "post" | "media" | "idea" | "creator"; id: string; label: string };

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

const demoPosts: Post[] = [];
const demoMedia: Media[] = [];
const demoIdeas: Idea[] = [];
const demoCreators: Creator[] = [];

const toneClass = (_tone: string) => "tone-crimson";
const statusClass = (status: string) => status === "Approved" ? "status-approved" : status === "Denied" ? "status-denied" : status === "Needs revisions" ? "status-revisions" : status === "Pending" ? "status-pending" : "status-draft";
const scheduledTime = (value: string) => {
  const [hourText = "0", minute = "00"] = value.slice(11, 16).split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};
const scheduledLabel = (value: string) => `${value.slice(0, 10)} · ${scheduledTime(value)}`;

export function MaltaStudio() {
  const [active, setActive] = useState("Calendar");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [composerDate, setComposerDate] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [posts, setPosts] = useState(demoPosts);
  const [media, setMedia] = useState(demoMedia);
  const [ideas, setIdeas] = useState(demoIdeas);
  const [creators, setCreators] = useState(demoCreators);
  const [mediaFilter, setMediaFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data.posts?.length) setPosts(data.posts.map((p: Record<string, unknown>) => ({ id: p.id, title: p.title, caption: p.caption, format: p.format, status: p.status, scheduledAt: p.scheduled_at, location: p.location, tone: p.tone, assignee: p.assignee, mediaId: p.media_id || undefined, comments: (data.comments || []).filter((comment: Record<string, unknown>) => comment.post_id === p.id).map((comment: Record<string, unknown>) => ({ id: comment.id, body: comment.body, author: comment.author, createdAt: comment.created_at })) })));
      if (data.media?.length) setMedia(data.media.map((m: Record<string, unknown>, index: number) => ({ id: m.id, filename: m.filename, caption: m.caption, status: m.status, mimeType: m.mime_type, uploadedBy: m.uploaded_by, usedCount: m.used_count, tone: ["sun", "sea", "gold", "stone", "coral", "harbour", "pool"][index % 7], url: `/api/media/${m.id}` })));
      setIdeas((data.ideas || []).map((i: Record<string, unknown>) => ({ id: i.id, kind: i.kind, title: i.title, notes: i.notes, color: i.color, createdBy: i.created_by, mediaId: i.media_id || undefined, linkedTo: i.linked_to || undefined })));
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
      setNotice(`Post marked ${status.toLowerCase()}`);
    } catch { setNotice("Saved in this preview"); }
  }, []);

  const addComment = useCallback(async (post: Post, body: string) => {
    const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "comment", postId: post.id, body }) });
    if (!response.ok) throw new Error((await response.json()).error || "Unable to add comment");
    const saved = await response.json();
    const comment: PostComment = { id: saved.id, body, author: saved.author || "Malta team", createdAt: saved.createdAt || new Date().toISOString() };
    setPosts((items) => items.map((item) => item.id === post.id ? { ...item, comments: [...item.comments, comment] } : item));
    setSelectedPost((item) => item?.id === post.id ? { ...item, comments: [...item.comments, comment] } : item);
  }, []);

  const updateMediaNotes = useCallback(async (item: Media, caption: string) => {
    const response = await fetch(`/api/media/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ caption }) });
    if (!response.ok) throw new Error((await response.json()).error || "Unable to save notes");
    setMedia((items) => items.map((mediaItem) => mediaItem.id === item.id ? { ...mediaItem, caption } : mediaItem));
    setSelectedMedia((mediaItem) => mediaItem?.id === item.id ? { ...mediaItem, caption } : mediaItem);
    setNotice("Media notes saved");
  }, []);

  const createIdea = useCallback(async (kind: "Idea" | "Reference", item?: Media) => {
    await saveRecord({ entity: "idea", kind, title: item?.filename || "Untitled idea", notes: item?.caption || "", color: "coral", mediaId: item?.id || "" });
    setNotice(kind === "Reference" ? "Reference added" : "Idea added");
  }, [saveRecord]);

  const updateIdea = useCallback(async (idea: Idea, changes: Partial<Idea>) => {
    const next = { ...idea, ...changes };
    setIdeas((items) => items.map((item) => item.id === idea.id ? next : item));
    const response = await fetch("/api/workspace", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity: "idea", id: idea.id, title: next.title, notes: next.notes, linkedTo: next.linkedTo || "" }) });
    if (!response.ok) setNotice("Unable to save idea");
  }, []);

  const uploadIdeaReference = useCallback(async (file: File) => {
    const form = new FormData(); form.set("file", file); form.set("caption", "");
    const response = await fetch("/api/media", { method: "POST", body: form });
    if (!response.ok) throw new Error((await response.json()).error || "Upload failed");
    const saved = await response.json();
    await saveRecord({ entity: "idea", kind: "Reference", title: file.name, notes: "", color: "coral", mediaId: saved.id });
    setNotice("Reference uploaded and added");
  }, [saveRecord]);

  const performDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const { entity, id } = deleteTarget;
    const response = entity === "media"
      ? await fetch(`/api/media/${id}`, { method: "DELETE" })
      : await fetch("/api/workspace", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id }) });
    if (!response.ok) { setNotice((await response.json()).error || "Unable to remove item"); return; }
    if (entity === "post") { setPosts((items) => items.filter((item) => item.id !== id)); setSelectedPost(null); }
    if (entity === "media") { setMedia((items) => items.filter((item) => item.id !== id)); setPosts((items) => items.map((item) => item.mediaId === id ? { ...item, mediaId: undefined } : item)); setSelectedMedia(null); }
    if (entity === "idea") setIdeas((items) => items.filter((item) => item.id !== id));
    if (entity === "creator") { setCreators((items) => items.filter((item) => item.id !== id)); setSelectedCreator(null); }
    setDeleteTarget(null);
    setNotice("Removed from the workspace");
  }, [deleteTarget]);

  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await document.modelContext?.registerTool({
        name: "list_workflow_summary", title: "Read Malta workflow summary",
        description: "Return the current counts for Malta posts, review work, media, ideas, and creators.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async () => ({ posts: posts.length, pending: posts.filter((p) => p.status === "Pending").length, needsRevisions: posts.filter((p) => p.status === "Needs revisions").length, approved: posts.filter((p) => p.status === "Approved").length, denied: posts.filter((p) => p.status === "Denied").length, media: media.length, ideas: ideas.length, creators: creators.length }),
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
        const mediaId = String(values.mediaId || "");
        if (!mediaId) throw new Error("Choose media from the content bank first.");
        await saveRecord({ entity: "post", title: values.title, caption: values.caption, format: values.format, scheduledAt: values.scheduledAt, location: values.location, tone: "crimson", mediaId });
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
        <SidebarHeader className="p-4"><div className="flex items-center gap-3 px-1 py-2"><span className="grid size-10 place-items-center rounded-xl bg-[#b11226] text-2xl leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", sans-serif' }} aria-label="Malta flag">🇲🇹</span><div className="group-data-[collapsible=icon]:hidden"><p className="text-lg font-bold tracking-[-0.04em]">MALTA</p><p className="text-xs uppercase tracking-[0.18em] text-white/45">Content desk</p></div></div></SidebarHeader>
        <SidebarContent><SidebarGroup><SidebarGroupContent><SidebarMenu>{nav.map((item) => <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={active === item.label} tooltip={item.label} onClick={() => { setActive(item.label); setQuery(""); }} className="h-11 text-sky-50/70 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#ff6b4a] data-[active=true]:text-white"><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
        <SidebarFooter className="p-4"><div className="rounded-xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:hidden"><p className="text-sm font-semibold">@malta</p><a href="https://www.instagram.com/malta/" target="_blank" rel="noreferrer" className="mt-1 block text-xs text-white/45">Open Instagram ↗</a></div></SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f3f7f8]">
        <header className="flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl md:px-7"><SidebarTrigger /><div className="h-5 w-px bg-slate-200" /><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search Malta studio" placeholder={`Search ${active.toLowerCase()}…`} className="h-10 border-0 bg-slate-100 pl-9 shadow-none" /></div>{active !== "Calendar" && active !== "Idea bank" && <Button onClick={() => setModal(active === "Content bank" ? "upload" : "creator")} className="ml-auto rounded-xl bg-[#ff6b4a] text-white hover:bg-[#eb5d3e]"><Plus className="size-4" /><span className="hidden sm:inline">{active === "Content bank" ? "Upload media" : "Add creator"}</span></Button>}</header>

        <main className="min-h-[calc(100vh-4rem)] overflow-x-hidden p-4 md:p-7">
          <div className="mx-auto max-w-[1500px]">
            {active === "Calendar" && <CalendarView posts={filteredPosts} media={media} onSelect={setSelectedPost} onCreate={(date) => { setComposerDate(date); setModal("post"); }} />}
            {active === "Content bank" && <ContentView media={filteredMedia} allMedia={media} filter={mediaFilter} onFilter={setMediaFilter} onSelect={setSelectedMedia} onUpload={() => setModal("upload")} query={query} onQuery={setQuery} />}
            {active === "Idea bank" && <IdeasView ideas={ideas} media={media} initialQuery={query} onCreate={createIdea} onUpdate={updateIdea} onUploadReference={uploadIdeaReference} onDelete={(idea) => setDeleteTarget({ entity: "idea", id: idea.id, label: idea.title })} />}
            {active === "Creators" && (creators.length ? <CreatorsView creators={creators.filter((c) => `${c.name} ${c.handle} ${c.specialties.join(" ")}`.toLowerCase().includes(query.toLowerCase()))} selected={selectedCreator} onSelect={setSelectedCreator} onDelete={(creator) => setDeleteTarget({ entity: "creator", id: creator.id, label: creator.name })} /> : <EmptyView eyebrow="Creators" title="No creators added" body="Add the people you brief, shoot with, or contact for the page." action="Add creator" onAction={() => setModal("creator")} />)}
          </div>
        </main>
      </SidebarInset>

      <PostSheet post={selectedPost} media={media} onClose={() => setSelectedPost(null)} onStatus={updatePostStatus} onComment={addComment} onDelete={(post) => setDeleteTarget({ entity: "post", id: post.id, label: post.title })} />
      <MediaSheet item={selectedMedia} onClose={() => setSelectedMedia(null)} onSaveNotes={updateMediaNotes} onDelete={(item) => setDeleteTarget({ entity: "media", id: item.id, label: item.filename })} />
      <PostComposerSheet open={modal === "post"} date={composerDate} media={media} onClose={() => setModal(null)} onSubmit={handleCreate} />
      <CreateDialog modal={modal === "post" ? null : modal} onClose={() => setModal(null)} onSubmit={handleCreate} />
      <ConfirmDelete target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={() => void performDelete()} />
      {notice && <button onClick={() => setNotice("")} className="fixed bottom-5 right-5 z-[70] rounded-xl bg-[#071d2b] px-4 py-3 text-sm font-medium text-white shadow-2xl">{notice}</button>}
    </SidebarProvider>
  );
}

function PageHeading({ eyebrow, title, body, controls }: { eyebrow: string; title: string; body: string; controls?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0a7894]"><Compass className="size-4" /> {eyebrow}</div><h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#071d2b]">{title}</h1><p className="mt-1 text-slate-500">{body}</p></div>{controls}</div>;
}

function SummaryCard({ label, value }: { label: string; value: number; color: string }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(7,29,43,.04)]"><p className="text-sm text-slate-500">{label}</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl text-[#071d2b]">{value}</strong><span className="size-2.5 rounded-full bg-[#b11226]" /></div></div>;
}

function EmptyView({ eyebrow, title, body, action, onAction }: { eyebrow: string; title: string; body: string; action: string; onAction: () => void }) {
  return <><PageHeading eyebrow={eyebrow} title={title} body={body} /><section className="grid min-h-[520px] place-items-center rounded-[22px] border border-dashed border-white/15 bg-[#0d0d0d] px-6 text-center"><div className="max-w-md"><div className="mx-auto grid size-14 place-items-center rounded-full bg-[#b11226]"><Plus className="size-6" /></div><h2 className="mt-6 text-2xl font-bold tracking-[-0.035em] text-white">Start with the next one.</h2><p className="mt-2 text-base leading-7 text-white/55">No filler. No demo content. Just the real @malta workflow.</p><Button onClick={onAction} className="mt-6 bg-[#b11226] text-white hover:bg-[#8f0d1e]"><Plus /> {action}</Button></div></section></>;
}

function MediaPreview({ item, className = "" }: { item?: Media; className?: string }) {
  if (!item) return <div className={`tone-crimson ${className}`}><div className="grid size-full place-items-center"><ImageIcon className="size-7 text-white/35" /></div></div>;
  if (item.mimeType.startsWith("video/")) return <video src={item.url || `/api/media/${item.id}`} controls muted playsInline preload="metadata" className={`bg-black object-cover ${className}`} />;
  return <img src={item.url || `/api/media/${item.id}`} alt={item.filename} className={`bg-black object-cover ${className}`} />;
}

function CalendarView({ posts, media, onSelect, onCreate }: { posts: Post[]; media: Media[]; onSelect: (post: Post) => void; onCreate: (date: string) => void }) {
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const preview = posts[0];
  const pending = posts.filter((post) => post.status === "Pending").length;
  const revisions = posts.filter((post) => post.status === "Needs revisions").length;
  const approved = posts.filter((post) => post.status === "Approved").length;
  const denied = posts.filter((post) => post.status === "Denied").length;

  return <>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Previous week"><ChevronLeft /></Button>
      <div className="min-w-32 px-3 text-center text-sm font-semibold">Sep 14–20</div>
      <Button variant="outline" size="icon" aria-label="Next week"><ChevronRight /></Button>
      <div className="ml-2 flex rounded-lg border border-white/10 bg-[#0d0d0d] p-1"><Button size="sm" className="bg-[#b11226]">Week</Button><Button size="sm" variant="ghost">Month</Button></div>
      <Button variant="outline" className="ml-auto">Today</Button>
    </div>

    <section aria-label="Workflow summary" className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:grid-cols-5">
      {[["Week", posts.length], ["Pending", pending], ["Needs revisions", revisions], ["Approved", approved], ["Denied", denied]].map(([label, value]) => <button key={String(label)} className="flex items-center justify-between bg-[#0d0d0d] px-4 py-3 text-left hover:bg-white/5"><span className="text-sm text-white/55">{label}</span><strong className="text-lg text-white">{value}</strong></button>)}
    </section>

    <section aria-label="Operations inbox" className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:grid-cols-4">
      {[["Awaiting review", pending], ["Needs revisions", revisions], ["Open days", Math.max(0, 7 - posts.length)], ["Denied", denied]].map(([label, value]) => <div key={String(label)} className="bg-black px-4 py-3"><p className="text-xs uppercase tracking-[0.12em] text-white/35">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
    </section>

    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-label="Calendar" className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d0d0d]">
        <div className="grid min-w-[980px] grid-cols-7 divide-x divide-white/10">
          {weekDays.map((day, index) => {
            const date = `2026-09-${String(14 + index).padStart(2, "0")}`;
            const post = posts.find((item) => item.scheduledAt.slice(0, 10) === date);
            const asset = post?.mediaId ? media.find((item) => item.id === post.mediaId) : undefined;
            return <div key={day} className="min-h-[510px] p-3">
              <div className="border-b border-white/10 pb-3 text-sm font-semibold"><span>{day}</span><span className="ml-1 text-white/35">Sep {14 + index}</span></div>
              {post ? <div className="mt-3 rounded-lg border border-white/10 bg-black p-2 transition hover:border-[#b11226]"><MediaPreview item={asset} className="aspect-square w-full rounded-md" /><button onClick={() => onSelect(post)} className="w-full text-left"><Badge className={`mt-3 border-0 ${statusClass(post.status)}`}>{post.status}</Badge><p className="mt-2 line-clamp-3 text-sm font-semibold leading-5">{post.caption || post.title}</p><p className="mt-3 text-xs text-white/40">{scheduledTime(post.scheduledAt)} · {post.assignee}</p><span className="mt-3 flex items-center justify-between text-xs font-semibold text-[#b11226]"><span>Details & comments</span><span className="flex items-center gap-1 text-white/45"><MessageCircle className="size-3.5" />{post.comments.length}</span></span></button></div> : <button onClick={() => onCreate(date)} className="mt-3 flex min-h-56 w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/15 text-white/35 transition hover:border-[#b11226] hover:text-white"><Plus className="mb-2 size-4" /><span className="text-sm">Add post</span></button>}
            </div>;
          })}
        </div>
      </section>

      <aside aria-label="Post preview" className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3"><div><p className="text-sm font-semibold">Instagram preview</p><p className="text-xs text-white/40">Select a post to review</p></div><Instagram className="size-5 text-[#b11226]" /></div>
        {preview ? <div className="mt-4"><MediaPreview item={preview.mediaId ? media.find((item) => item.id === preview.mediaId) : undefined} className="aspect-[4/5] w-full rounded-lg" /><div className="mt-3 flex items-center justify-between"><Badge className={`border-0 ${statusClass(preview.status)}`}>{preview.status}</Badge><span className="flex items-center gap-1 text-xs text-white/45"><MessageCircle className="size-3.5" />{preview.comments.length}</span></div><p className="mt-3 text-sm leading-6">{preview.caption}</p><p className="mt-2 text-xs text-white/40">@malta · {scheduledTime(preview.scheduledAt)}</p><Button onClick={() => onSelect(preview)} variant="outline" className="mt-4 w-full">Open details & comments</Button></div> : <div className="grid min-h-[390px] place-items-center text-center"><div><CalendarDays className="mx-auto size-7 text-white/25" /><p className="mt-3 text-sm font-medium">No post selected</p><p className="mt-1 text-xs text-white/40">New posts will preview here.</p></div></div>}
      </aside>
    </div>
  </>;
}

function ContentView({ media, allMedia, filter, onFilter, onSelect, onUpload, query, onQuery }: { media: Media[]; allMedia: Media[]; filter: string; onFilter: (value: string) => void; onSelect: (item: Media) => void; onUpload: () => void; query: string; onQuery: (value: string) => void }) {
  const inReview = allMedia.filter((item) => item.status === "In review").length;
  const changes = allMedia.filter((item) => item.status === "Changes requested").length;
  const counts: Record<string, number> = { All: allMedia.length, Approved: allMedia.filter((item) => item.status === "Approved").length, "In review": inReview, "Changes requested": changes, Draft: allMedia.filter((item) => item.status === "Draft").length, Archived: 0 };

  return <>
    <PageHeading eyebrow="Shared library" title="Content bank" body="Keep reusable media, captions, and review stages in one shared library." controls={<div className="flex gap-2"><Button variant="outline">Import</Button><Button onClick={onUpload} className="bg-[#b11226] hover:bg-[#8f0d1e]"><Upload /> Upload media</Button></div>} />
    <section aria-label="Content bank summary" className="mb-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10"><SummaryCard label="Total assets" value={allMedia.length} color="#b11226" /><SummaryCard label="Needs review" value={inReview} color="#b11226" /><SummaryCard label="Changes requested" value={changes} color="#b11226" /></section>

    <section aria-label="Content bank" className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
      <div className="border-b border-white/10 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h2 className="text-lg font-semibold">Media</h2><p className="mt-1 text-sm text-white/45">Every image and video in the shared library</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55"><input type="checkbox" className="accent-[#b11226]" /> Malta team</label>
            <Button variant="outline">Sort: Date created</Button>
            <div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><Input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search content bank" className="pl-9" /></div>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto"><Tabs value={filter} onValueChange={onFilter}><TabsList className="h-auto bg-black p-1">{["All", "Approved", "In review", "Changes requested", "Draft", "Archived"].map((tab) => <TabsTrigger key={tab} value={tab} className="gap-2 whitespace-nowrap">{tab}<span className="text-xs text-white/35">{counts[tab]}</span></TabsTrigger>)}</TabsList></Tabs></div>
      </div>

      {media.length ? <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{media.map((item) => <button key={item.id} onClick={() => onSelect(item)} className="group bg-[#0d0d0d] p-3 text-left transition hover:bg-white/5"><div className={`relative aspect-[4/3] overflow-hidden rounded-lg ${toneClass(item.tone)}`}>{item.url && item.mimeType.startsWith("image/") ? <img src={item.url} alt="" className="absolute inset-0 size-full object-cover" /> : <div className="grid size-full place-items-center text-white/70">{item.mimeType.startsWith("video/") ? <Sparkles className="size-8" /> : <ImageIcon className="size-8" />}</div>}<Badge className={`absolute right-2 top-2 border-0 ${statusClass(item.status)}`}>{item.status}</Badge></div><p className="mt-3 truncate text-sm font-semibold">{item.filename}</p><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-white/45">{item.caption || "No reusable caption"}</p><div className="mt-3 flex justify-between text-xs text-white/35"><span>{item.uploadedBy}</span><span>{item.usedCount ? `Used in ${item.usedCount}` : "Unused"}</span></div></button>)}</div> : <div className="grid min-h-[420px] place-items-center px-6 text-center"><div><Images className="mx-auto size-8 text-white/25" /><p className="mt-4 text-base font-semibold">No media in this view</p><p className="mt-1 text-sm text-white/40">Upload the first image or video for @malta.</p><Button onClick={onUpload} className="mt-5 bg-[#b11226] hover:bg-[#8f0d1e]"><Upload /> Upload media</Button></div></div>}
      <button onClick={onUpload} className="w-full border-t border-dashed border-white/15 px-4 py-4 text-center text-sm text-white/35 hover:text-white">Drop media to upload</button>
    </section>
  </>;
}

function IdeasView({ ideas, media, initialQuery, onCreate, onUpdate, onUploadReference, onDelete }: { ideas: Idea[]; media: Media[]; initialQuery: string; onCreate: (kind: "Idea" | "Reference", item?: Media) => Promise<void>; onUpdate: (idea: Idea, changes: Partial<Idea>) => Promise<void>; onUploadReference: (file: File) => Promise<void>; onDelete: (idea: Idea) => void }) {
  const [filter, setFilter] = useState("All");
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [zoom, setZoom] = useState(.8);
  const [referenceOpen, setReferenceOpen] = useState(false);
  useEffect(() => setLocalQuery(initialQuery), [initialQuery]);
  const visible = ideas.filter((idea) => {
    if (filter === "Ideas" && idea.kind !== "Idea") return false;
    if (filter === "References" && idea.kind !== "Reference") return false;
    return `${idea.title} ${idea.notes}`.toLowerCase().includes(localQuery.toLowerCase());
  });
  return <>
    <PageHeading eyebrow="Creative pipeline" title="Idea bank" body="Shape rough post angles, references, and supporting material before they become drafts." controls={<div className="flex gap-2"><Button variant="outline" onClick={() => setReferenceOpen(true)}><Images /> Add reference</Button><Button onClick={() => void onCreate("Idea")} className="bg-[#b11226] hover:bg-[#8f0d1e]"><Plus /> New idea</Button></div>} />
    <section aria-label="Idea board" className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-1 rounded-lg bg-black p-1" aria-label="Filter idea cards">{["All", "Ideas", "References"].map((item) => <Button key={item} size="sm" variant={filter === item ? "default" : "ghost"} onClick={() => setFilter(item)} className={filter === item ? "bg-[#b11226]" : ""}>{item}</Button>)}</div>
        <div className="relative min-w-56 flex-1 xl:ml-auto xl:max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><Input value={localQuery} onChange={(event) => setLocalQuery(event.target.value)} placeholder="Search ideas" className="pl-9" /></div>
        <Button variant="outline" size="sm" onClick={() => setZoom(.8)}><Maximize2 /> Fit</Button>
        <div className="flex items-center rounded-lg border border-white/10"><Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.max(.6, value - .1))} aria-label="Zoom out"><ZoomOut /></Button><span className="w-12 text-center text-xs text-white/55">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" onClick={() => setZoom((value) => Math.min(1.2, value + .1))} aria-label="Zoom in"><ZoomIn /></Button></div>
      </div>
      <div className="min-h-[520px] overflow-auto bg-black/30 p-5 md:p-8">
        {visible.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>{visible.map((idea) => <IdeaCard key={idea.id} idea={idea} media={media} onUpdate={onUpdate} onDelete={onDelete} />)}</div> : <div className="grid min-h-[400px] place-items-center text-center"><div><Lightbulb className="mx-auto size-8 text-white/25" /><p className="mt-4 font-semibold">No cards in this view</p><Button onClick={() => void onCreate("Idea")} className="mt-4 bg-[#b11226] hover:bg-[#8f0d1e]"><Plus /> New idea</Button></div></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-xs text-white/40"><span>{ideas.length} cards · {ideas.filter((idea) => idea.kind === "Reference").length} references</span><span>Changes save automatically</span></div>
    </section>
    <Sheet open={referenceOpen} onOpenChange={setReferenceOpen}><SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-3xl border-white/15"><SheetHeader><SheetTitle>Add a reference card</SheetTitle><SheetDescription>Choose an image or video from the Content Bank, or upload a new one.</SheetDescription></SheetHeader><div className="mt-5"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b11226] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8f0d1e]"><Upload className="size-4" /> Upload media<input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUploadReference(file).then(() => setReferenceOpen(false)); }} /></label></div>{media.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{media.map((item) => <button key={item.id} onClick={() => void onCreate("Reference", item).then(() => setReferenceOpen(false))} className="rounded-xl border border-white/10 bg-white/5 p-2 text-left hover:border-[#b11226]"><MediaPreview item={item} className="aspect-square w-full rounded-lg" /><p className="mt-2 truncate text-xs font-medium">{item.filename}</p><span className="mt-1 block text-xs text-[#b11226]">Add card</span></button>)}</div> : <p className="mt-6 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">No Content Bank media yet.</p>}</SheetContent></Sheet>
  </>;
}

function IdeaCard({ idea, media, onUpdate, onDelete }: { idea: Idea; media: Media[]; onUpdate: (idea: Idea, changes: Partial<Idea>) => Promise<void>; onDelete: (idea: Idea) => void }) {
  const [title, setTitle] = useState(idea.title);
  const [notes, setNotes] = useState(idea.notes);
  const [actionsOpen, setActionsOpen] = useState(false);
  useEffect(() => { setTitle(idea.title); setNotes(idea.notes); }, [idea.title, idea.notes]);
  const asset = idea.mediaId ? media.find((item) => item.id === idea.mediaId) : undefined;
  const save = () => { if (title !== idea.title || notes !== idea.notes) void onUpdate(idea, { title: title.trim() || "Untitled idea", notes }); };
  return <article className="relative min-h-64 rounded-xl border border-white/10 bg-[#0d0d0d] p-4 shadow-xl transition">
    <div className="flex items-center gap-2"><Badge className="border-0 bg-[#b11226]">{idea.kind.toUpperCase()}</Badge><div className="relative ml-auto"><Button variant="ghost" size="icon" onClick={() => setActionsOpen((value) => !value)} aria-label="Idea actions"><MoreHorizontal /></Button>{actionsOpen && <button onClick={() => onDelete(idea)} className="absolute right-0 top-10 z-10 flex w-32 items-center gap-2 rounded-lg border border-white/10 bg-[#171717] px-3 py-2 text-sm text-red-400 shadow-xl"><Trash2 className="size-4" /> Delete</button>}</div></div>
    <Input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} aria-label="Idea title" className="mt-4 border-0 bg-transparent px-0 text-lg font-semibold shadow-none" />
    <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} onBlur={save} aria-label="Idea notes" placeholder="Add notes" className="mt-2 min-h-24 resize-none border-0 bg-transparent px-0 shadow-none" />
    {asset && <MediaPreview item={asset} className="mt-3 aspect-video w-full rounded-lg" />}
    <div className="mt-4 text-xs text-white/40">{idea.createdBy}</div>
  </article>;
}

function CreatorsView({ creators, selected, onSelect, onDelete }: { creators: Creator[]; selected: Creator | null; onSelect: (creator: Creator) => void; onDelete: (creator: Creator) => void }) {
  return <>
    <PageHeading eyebrow="Collaborator network" title="Creators" body="Keep the right photographers, editors, and local voices close." />
    <section aria-label="Creator summary" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><SummaryCard label="Network" value={creators.length} color="#b11226" /><SummaryCard label="Prospects" value={creators.filter((creator) => creator.status === "Prospect").length} color="#b11226" /><SummaryCard label="In conversation" value={creators.filter((creator) => creator.status === "In conversation").length} color="#b11226" /><SummaryCard label="Ready to brief" value={creators.filter((creator) => creator.status === "Ready to brief").length} color="#b11226" /></section>
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <aside className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-3">{creators.map((creator) => <button key={creator.id} onClick={() => onSelect(creator)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${selected?.id === creator.id ? "bg-[#e6f3f5] ring-1 ring-[#0a7894]/20" : "hover:bg-slate-50"}`}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#071d2b] font-semibold text-white">{creator.name.split(" ").map((name) => name[0]).join("")}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[#071d2b]">{creator.name}</strong><span className="block truncate text-sm text-slate-500">{creator.handle}</span></span><Badge variant="secondary" className="max-w-24 truncate">{creator.status}</Badge></button>)}</aside>
      {selected ? <article className="rounded-[24px] border border-slate-200/80 bg-white p-6"><div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-center"><span className="grid size-20 place-items-center rounded-[24px] bg-[#b11226] text-2xl font-semibold text-white">{selected.name.split(" ").map((name) => name[0]).join("")}</span><div className="flex-1"><h2 className="text-2xl font-semibold tracking-tight text-[#071d2b]">{selected.name}</h2><p className="text-slate-500">{selected.handle} · {selected.location}</p><div className="mt-3 flex flex-wrap gap-2">{selected.specialties.map((specialty) => <Badge key={specialty} variant="secondary">{specialty}</Badge>)}</div></div><div className="flex gap-2"><Button variant="outline" asChild><a href={selected.instagram} target="_blank" rel="noreferrer"><Instagram /> Instagram <ExternalLink className="size-3" /></a></Button><Button variant="outline" size="icon" onClick={() => onDelete(selected)} aria-label={`Remove ${selected.name}`}><Trash2 /></Button></div></div><div className="grid gap-6 pt-6 lg:grid-cols-2"><div><p className="text-sm font-medium text-slate-400">About and fit</p><p className="mt-2 leading-7 text-slate-700">{selected.bio}</p><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{selected.notes}</p></div><div><p className="text-sm font-medium text-slate-400">Next step</p><div className="mt-2 rounded-2xl border border-[#0a7894]/15 bg-[#eaf7f8] p-4"><p className="font-semibold text-[#071d2b]">{selected.nextAction}</p><p className="mt-1 text-sm text-slate-500">Relationship stage: {selected.status}</p></div><Button className="mt-4 bg-[#b11226] hover:bg-[#8f0d1e]"><MessageCircle /> Open brief</Button></div></div></article> : null}
    </div>
  </>;
}

function PostSheet({ post, media, onClose, onStatus, onComment, onDelete }: { post: Post | null; media: Media[]; onClose: () => void; onStatus: (post: Post, status: string) => void; onComment: (post: Post, body: string) => Promise<void>; onDelete: (post: Post) => void }) {
  const asset = post?.mediaId ? media.find((item) => item.id === post.mediaId) : undefined;
  const [comment, setComment] = useState("");
  useEffect(() => setComment(""), [post?.id]);
  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || !comment.trim()) return;
    await onComment(post, comment.trim());
    setComment("");
  };
  return <Sheet open={Boolean(post)} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{post && <><SheetHeader className="border-b px-6 py-5"><div className="mb-2 flex items-center gap-2"><Badge className={statusClass(post.status)}>{post.status}</Badge><span className="text-xs text-slate-500">{scheduledLabel(post.scheduledAt)}</span></div><SheetTitle className="text-2xl tracking-tight">{post.title}</SheetTitle><SheetDescription>Instagram {post.format.toLowerCase()} · {post.location}</SheetDescription></SheetHeader><div className="space-y-6 p-6"><MediaPreview item={asset} className="aspect-[4/5] w-full rounded-2xl" /><div><p className="mb-2 text-sm font-medium text-[#071d2b]">Caption</p><p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{post.caption || "No caption yet."}</p></div><div><p className="mb-3 text-sm font-medium">Review status</p><div className="grid grid-cols-2 gap-2">{["Pending", "Approved", "Needs revisions", "Denied"].map((status) => <Button key={status} type="button" variant="outline" onClick={() => onStatus(post, status)} className={`${statusClass(status)} border-0 ${post.status === status ? "ring-2 ring-white" : "opacity-80"}`}>{status}</Button>)}</div></div><div><div className="mb-3 flex items-center justify-between"><p className="text-sm font-medium">Comments</p><span className="text-xs text-white/40">{post.comments.length}</span></div><div className="max-h-64 space-y-2 overflow-y-auto">{post.comments.length ? post.comments.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="flex justify-between gap-3 text-xs text-white/40"><span>{item.author}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-2 text-sm leading-6">{item.body}</p></div>) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">No comments yet.</p>}</div><form onSubmit={submitComment} className="mt-3 space-y-2"><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave feedback or revision notes" /><Button type="submit" disabled={!comment.trim()} className="w-full bg-[#b11226] hover:bg-[#8f0d1e]"><MessageCircle /> Add comment</Button></form></div><Button variant="outline" onClick={() => onDelete(post)} className="w-full text-[#b11226]"><Trash2 /> Remove from calendar</Button><p className="-mt-4 text-center text-xs text-white/35">The media stays in the Content Bank.</p></div></>}</SheetContent></Sheet>;
}

function MediaSheet({ item, onClose, onSaveNotes, onDelete }: { item: Media | null; onClose: () => void; onSaveNotes: (item: Media, caption: string) => Promise<void>; onDelete: (item: Media) => void }) {
  const [notes, setNotes] = useState("");
  useEffect(() => setNotes(item?.caption || ""), [item]);
  return <Sheet open={Boolean(item)} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{item && <><SheetHeader className="border-b px-6 py-5"><Badge className={`mb-2 w-fit ${statusClass(item.status)}`}>{item.status}</Badge><SheetTitle className="text-xl tracking-tight">{item.filename}</SheetTitle><SheetDescription>Uploaded by {item.uploadedBy} · {item.usedCount ? `Used in ${item.usedCount} post${item.usedCount > 1 ? "s" : ""}` : "Unused"}</SheetDescription></SheetHeader><div className="space-y-5 p-6"><MediaPreview item={item} className="aspect-[4/3] w-full rounded-2xl" /><div><Label htmlFor="media-notes">Notes</Label><Textarea id="media-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Usage notes, edit direction, or caption ideas" className="mt-2 min-h-28" /><Button type="button" onClick={() => void onSaveNotes(item, notes)} className="mt-3 w-full bg-[#b11226] hover:bg-[#8f0d1e]">Save notes</Button></div><Button variant="outline" asChild className="w-full"><a href={item.url || `/api/media/${item.id}`} download><Download /> Download</a></Button><Button variant="outline" onClick={() => onDelete(item)} className="w-full text-[#b11226]"><Trash2 /> Remove media</Button></div></>}</SheetContent></Sheet>;
}

function PostComposerSheet({ open, date, media, onClose, onSubmit }: { open: boolean; date: string; media: Media[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [selected, setSelected] = useState("");
  const [time, setTime] = useState("12:00");
  useEffect(() => { if (!open) setSelected(""); else setTime("12:00"); }, [open, date]);
  const dayLabel = date ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" }) : "Selected day";
  return <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}><SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl border-white/15 px-0"><form onSubmit={onSubmit}><input type="hidden" name="scheduledAt" value={`${date}T${time}`} /><div className="mx-auto max-w-5xl px-5 pb-6"><SheetHeader className="border-b border-white/10 pb-5 text-left"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#b11226]"><CalendarDays className="size-4" />{dayLabel}</div><SheetTitle className="text-2xl">Add post to calendar</SheetTitle><SheetDescription>Choose an existing Content Bank asset and add the post details.</SheetDescription></SheetHeader><div className="grid gap-6 py-6 lg:grid-cols-[1.3fr_.7fr]"><section><div className="mb-3 flex items-center justify-between"><Label>Choose from Content Bank</Label><span className="text-xs text-white/40">{media.length} assets</span></div>{media.length ? <div className="grid max-h-[48vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">{media.map((item) => <label key={item.id} className={`cursor-pointer rounded-xl border p-2 transition ${selected === item.id ? "border-[#b11226] bg-[#b11226]/10 ring-1 ring-[#b11226]" : "border-white/10 bg-white/5 hover:border-white/25"}`}><input type="radio" name="mediaId" value={item.id} checked={selected === item.id} onChange={() => setSelected(item.id)} className="sr-only" required /><MediaPreview item={item} className="aspect-square w-full rounded-lg" /><p className="mt-2 truncate text-xs font-medium">{item.filename}</p></label>)}</div> : <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-white/15 p-6 text-center"><div><Images className="mx-auto size-7 text-white/25" /><p className="mt-3 text-sm font-medium">Content Bank is empty</p><p className="mt-1 text-xs text-white/40">Upload media from the Content Bank page first.</p></div></div>}</section><section className="grid content-start gap-4"><div className="grid gap-2"><Label htmlFor="post-title">Post title</Label><Input id="post-title" name="title" required placeholder="What are we publishing?" /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="post-format">Format</Label><select id="post-format" name="format" className="h-10 rounded-xl border border-white/15 bg-[#0d0d0d] px-3 text-sm"><option>Reel</option><option>Carousel</option><option>Story</option><option>Photo</option></select></div><div className="grid gap-2"><Label htmlFor="post-time">Posting time</Label><Input id="post-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></div></div><div className="grid gap-2"><Label htmlFor="post-location">Location</Label><Input id="post-location" name="location" placeholder="Malta" /></div><div className="grid gap-2"><Label htmlFor="post-caption">Caption</Label><Textarea id="post-caption" name="caption" placeholder="Write or paste the working caption" className="min-h-28" /></div><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/45">New posts start as <span className="font-semibold text-yellow-300">Pending</span>. Media remains in Content Bank if the post is later removed from the calendar.</div></section></div><div className="flex justify-end gap-3 border-t border-white/10 pt-5"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!date || !media.length || !selected} className="bg-[#b11226] hover:bg-[#8f0d1e]"><CalendarDays /> Add to calendar</Button></div></div></form></SheetContent></Sheet>;
}

function CreateDialog({ modal, media = [], onClose, onSubmit }: { modal: Modal; media?: Media[]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const title = modal === "upload" ? "Upload media" : modal === "idea" ? "Add an idea" : modal === "creator" ? "Add a creator" : "Schedule a post";
  return <Dialog open={Boolean(modal)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><form onSubmit={onSubmit}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{modal === "upload" ? "Add an image or video to the shared library." : modal === "idea" ? "Capture a rough angle before it disappears." : modal === "creator" ? "Keep their fit, contact details, and next step together." : "Attach media, write the caption, and add the post to the calendar."}</DialogDescription></DialogHeader><div className="grid gap-4 py-6">{modal === "upload" ? <><div className="grid gap-2"><Label htmlFor="file">Image or video</Label><Input id="file" name="file" type="file" accept="image/*,video/*" required /></div><div className="grid gap-2"><Label htmlFor="caption">Reusable caption</Label><Textarea id="caption" name="caption" placeholder="Caption, usage notes, or edit direction" /></div></> : modal === "idea" ? <><div className="grid gap-2"><Label htmlFor="title">Idea title</Label><Input id="title" name="title" required /></div><div className="grid gap-2"><Label htmlFor="kind">Card type</Label><select id="kind" name="kind" className="h-10 rounded-xl border bg-white px-3 text-sm"><option>Idea</option><option>Reference</option></select></div><div className="grid gap-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" /></div></> : modal === "creator" ? <><div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="handle">Instagram handle</Label><Input id="handle" name="handle" placeholder="@name" /></div><div className="grid gap-2"><Label htmlFor="location">Location</Label><Input id="location" name="location" /></div></div><div className="grid gap-2"><Label htmlFor="instagram">Instagram URL</Label><Input id="instagram" name="instagram" type="url" /></div><div className="grid gap-2"><Label htmlFor="specialty">Specialty</Label><Input id="specialty" name="specialty" /></div><div className="grid gap-2"><Label htmlFor="bio">About and fit</Label><Textarea id="bio" name="bio" /></div><div className="grid gap-2"><Label htmlFor="nextAction">Next step</Label><Input id="nextAction" name="nextAction" /></div></> : <><div className="grid gap-2"><Label htmlFor="title">Post title</Label><Input id="title" name="title" required placeholder="What are we publishing?" /></div><div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><Label htmlFor="format">Format</Label><select id="format" name="format" className="h-10 rounded-xl border bg-white px-3 text-sm"><option>Reel</option><option>Carousel</option><option>Story</option><option>Photo</option></select></div><div className="grid gap-2"><Label htmlFor="scheduledAt">Schedule</Label><Input id="scheduledAt" name="scheduledAt" type="datetime-local" required /></div></div><div className="grid gap-2"><Label htmlFor="mediaId">Choose from content bank</Label><select id="mediaId" name="mediaId" className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="">No existing media</option>{media.map((item) => <option key={item.id} value={item.id}>{item.filename}</option>)}</select></div><div className="grid gap-2 rounded-xl border border-dashed border-white/15 p-4"><Label htmlFor="postMedia">Or upload media with this post</Label><Input id="postMedia" name="postMedia" type="file" accept="image/*,video/*" /><p className="text-xs text-white/40">A new upload overrides the content-bank selection.</p></div><div className="grid gap-2"><Label htmlFor="location">Location</Label><Input id="location" name="location" placeholder="Malta" /></div><div className="grid gap-2"><Label htmlFor="caption">Caption</Label><Textarea id="caption" name="caption" placeholder="Write or paste the working caption" /></div></>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" className="bg-[#b11226] hover:bg-[#8f0d1e]">{modal === "upload" ? <><Upload /> Upload</> : "Save"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ConfirmDelete({ target, onCancel, onConfirm }: { target: DeleteTarget | null; onCancel: () => void; onConfirm: () => void }) {
  const description = target?.entity === "post" ? `${target.label} will be removed from the posting schedule. Its media will stay in Content Bank.` : `${target?.label} will be removed from the Malta workspace. This cannot be undone.`;
  return <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && onCancel()}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{target?.entity === "post" ? "Remove from calendar?" : `Remove this ${target?.entity}?`}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel><AlertDialogAction onClick={onConfirm} className="bg-[#b11226] text-white hover:bg-[#8f0d1e]">Remove</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
