export type JournalEntry = {
  slug: string;
  title: string;
  date: string;
  category: "技术" | "随笔" | "摄影";
  summary: string;
  cover: string;
  sample: boolean;
  sections: { title: string; text: string }[];
  markdown?: string;
};
export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  type: string;
  stack: string;
  summary: string;
  visual: "notes" | "photo" | "grid";
  cover: string;
  url: string;
  featured: boolean;
  sample: boolean;
  details: string[];
};
export type Photograph = {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  orientation: "horizontal" | "vertical";
  private?: boolean;
  albumId?: string;
  date?: string;
  location?: string;
  importKey?: string;
  placeId?: string;
};
export type PhotoPlace = {
  id: string;
  name: string;
  city: string;
  aliases: string[];
  latitude: number | null;
  longitude: number | null;
};
export type PhotoAlbum = {
  id: string;
  title: string;
  date: string;
  location: string;
  note: string;
  coverId: string;
  private: boolean;
};
export type SiteContent = {
  version: 1;
  site: {
    name: string;
    title: string;
    description: string;
    url: string;
    tagline: string;
    email: string;
    github: string;
    showSampleNotes: boolean;
  };
  home: {
    badge: string;
    headline: string;
    subheadline: string;
    intro: string;
    cover: string;
    coverAlt: string;
    coverTitle: string;
    coverSubtitle: string;
    coverDescription: string;
  };
  about: { title: string; greeting: string; body: string; interests: string };
  pages: {
    blogTitle: string;
    blogIntro: string;
    galleryTitle: string;
    gallerySubtitle: string;
    galleryIntro: string;
    galleryCredit: string;
    galleryCreditUrl: string;
    workTitle: string;
    workIntro: string;
  };
  journal: JournalEntry[];
  projects: Project[];
  photographs: Photograph[];
  albums?: PhotoAlbum[];
  places?: PhotoPlace[];
};

export class ContentError extends Error {}
const fail = (message: string): never => {
  throw new ContentError(message);
};
function obj(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}的格式不正确`);
  return value as Record<string, unknown>;
}
function string(value: unknown, label: string, max = 500, required = false): string {
  if (typeof value !== "string" || value.length > max || (required && !value.trim()))
    fail(`${label}${required ? "不能为空，且" : ""}最多 ${max} 个字符`);
  return value as string;
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label}必须是开关值`);
  return value as boolean;
}
function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(`${label}最多 ${max} 项`);
  return value as unknown[];
}
function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (!values.includes(value as T)) fail(`${label}的选项不正确`);
  return value as T;
}
function url(value: unknown, label: string): string {
  const text = string(value, label, 2000);
  if (!text) return text;
  try {
    if (new URL(text).protocol !== "https:") fail(`${label}请填写 https:// 开头的网址`);
  } catch {
    fail(`${label}请填写完整的 HTTPS 网址`);
  }
  return text;
}
function image(value: unknown, label: string, required = false): string {
  const text = string(value, label, 500, required);
  if (
    text &&
    (!/^\/images\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(text) || text.includes(".."))
  )
    fail(`${label}请上传图片，或填写 /images/ 下的图片路径`);
  return text;
}
function slug(value: unknown, label: string): string {
  const text = string(value, label, 100, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) fail(`${label}只能使用小写英文、数字和连字符`);
  return text;
}
function photoDate(value: unknown): string {
  const date = string(value ?? "", "拍摄日期", 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) fail("拍摄日期不正确");
  return date;
}
function coordinate(value: unknown, label: string, limit: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) fail(`${label}必须是 -${limit} 到 ${limit} 之间的数字`);
  return value as number;
}
export function validateContent(input: unknown): SiteContent {
  const root = obj(input, "内容");
  if (root.version !== 1) fail("不支持这个备份版本");
  const s = obj(root.site, "站点设置"),
    h = obj(root.home, "首页"),
    a = obj(root.about, "个人介绍"),
    p = obj(root.pages, "页面标题");
  const content: SiteContent = {
    version: 1,
    site: {
      name: string(s.name, "姓名", 80, true),
      title: string(s.title, "网站标题", 150, true),
      description: string(s.description, "网站描述", 500),
      url: url(s.url, "网站地址"),
      tagline: string(s.tagline, "导航标语", 150),
      email: string(s.email, "邮箱", 200),
      github: url(s.github, "GitHub 地址"),
      showSampleNotes: bool(s.showSampleNotes, "示例说明"),
    },
    home: {
      badge: string(h.badge, "首页小标签", 150),
      headline: string(h.headline, "首页主标题", 150, true),
      subheadline: string(h.subheadline, "首页第二行标题", 150),
      intro: string(h.intro, "首页介绍", 3000),
      cover: image(h.cover, "首页封面", true),
      coverAlt: string(h.coverAlt, "封面描述", 500),
      coverTitle: string(h.coverTitle, "封面第一行标题", 150),
      coverSubtitle: string(h.coverSubtitle, "封面第二行标题", 150),
      coverDescription: string(h.coverDescription, "封面说明", 500),
    },
    about: {
      title: string(a.title, "关于页标题", 150),
      greeting: string(a.greeting, "问候语", 500),
      body: string(a.body, "个人介绍", 20000),
      interests: string(a.interests, "兴趣", 2000),
    },
    pages: {
      blogTitle: string(p.blogTitle, "博客标题", 150),
      blogIntro: string(p.blogIntro, "博客副标题", 2000),
      galleryTitle: string(p.galleryTitle, "摄影标题", 150),
      gallerySubtitle: string(p.gallerySubtitle, "摄影第二行标题", 150),
      galleryIntro: string(p.galleryIntro, "摄影介绍", 3000),
      galleryCredit: string(p.galleryCredit, "摄影署名", 1000),
      galleryCreditUrl: url(p.galleryCreditUrl, "摄影署名链接"),
      workTitle: string(p.workTitle, "项目页标题", 150),
      workIntro: string(p.workIntro, "项目页介绍", 2000),
    },
    journal: list(root.journal, "文章", 300).map((item, i) => {
      const v = obj(item, `文章 ${i + 1}`);
      const date = string(v.date, "文章日期", 10, true);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        fail("文章日期不正确");
      const sections = list(v.sections, "文章段落", 100).map((section) => {
        const x = obj(section, "段落");
        return { title: string(x.title, "段落标题", 300), text: string(x.text, "段落正文", 50000) };
      });
      if (!sections.length) fail("每篇文章至少保留一个段落");
      return {
        slug: slug(v.slug, "文章链接标识"),
        title: string(v.title, "文章标题", 300, true),
        date,
        category: choice(v.category, ["技术", "随笔", "摄影"], "文章分类"),
        summary: string(v.summary, "文章摘要", 5000),
        cover: image(v.cover, "文章封面"),
        sample: bool(v.sample, "示例文章说明"),
        sections,
        ...(v.markdown === undefined ? {} : { markdown: string(v.markdown, "Markdown 正文", 100000) }),
      };
    }),
    projects: list(root.projects, "项目", 100).map((item) => {
      const v = obj(item, "项目");
      return {
        slug: slug(v.slug, "项目链接标识"),
        name: string(v.name, "项目名称", 150, true),
        eyebrow: string(v.eyebrow, "项目小标题", 150),
        type: string(v.type, "项目类别", 100),
        stack: string(v.stack, "技术栈", 500),
        summary: string(v.summary, "项目简介", 5000),
        visual: choice(v.visual, ["notes", "photo", "grid"], "卡片样式"),
        cover: image(v.cover, "项目封面"),
        url: url(v.url, "项目链接"),
        featured: bool(v.featured, "首页展示"),
        sample: bool(v.sample, "示例项目说明"),
        details: list(v.details, "项目说明段落", 100).map((v) => string(v, "项目正文", 30000)),
      };
    }),
    places: list(root.places ?? [], "地点", 300).map(item => {
      const v = obj(item, "地点");
      const latitude = coordinate(v.latitude, "纬度", 90);
      const longitude = coordinate(v.longitude, "经度", 180);
      if ((latitude === null) !== (longitude === null)) fail("经度和纬度需要一起填写，或一起留空");
      return { id: slug(v.id, "地点标识"), name: string(v.name, "地点名称", 200, true),
        city: string(v.city ?? '', "所在城市", 100),
        aliases: list(v.aliases ?? [], "地点其他写法", 30).map(a => string(a, "地点其他写法", 200, true)), latitude, longitude };
    }),
    albums: list(root.albums ?? [], "相册", 300).map((item) => {
      const v = obj(item, "相册");
      return {
        id: slug(v.id, "相册标识"), title: string(v.title, "相册标题", 200, true),
        date: photoDate(v.date), location: string(v.location ?? "", "相册地点", 200),
        note: string(v.note ?? "", "相册小记", 10000),
        coverId: v.coverId ? slug(v.coverId, "相册封面") : "",
        private: bool(v.private, "私密相册"),
      };
    }),
    photographs: list(root.photographs, "照片", 300).map((item) => {
      const v = obj(item, "照片");
      return {
        id: slug(v.id, "照片标识"),
        src: image(v.src, "照片", true),
        title: string(v.title, "照片标题", 200, true),
        subtitle: string(v.subtitle, "照片说明", 2000),
        orientation: choice(v.orientation, ["horizontal", "vertical"], "照片方向"),
        private: v.private === undefined ? false : bool(v.private, "私密照片"),
        albumId: v.albumId ? slug(v.albumId, "所属相册") : "",
        date: photoDate(v.date), location: string(v.location ?? "", "拍摄地点", 200),
        importKey: string(v.importKey ?? "", "导入标识", 64),
        placeId: v.placeId ? slug(v.placeId, "地点归类") : "",
      };
    }),
  };
  if (content.site.email && !/^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(content.site.email))
    fail("邮箱格式不正确");
  for (const [label, values] of [
    ["文章", content.journal.map((v) => v.slug)],
    ["项目", content.projects.map((v) => v.slug)],
    ["照片", content.photographs.map((v) => v.id)],
    ["相册", (content.albums ?? []).map((v) => v.id)],
    ["地点", (content.places ?? []).map((v) => v.id)],
  ] as const)
    if (new Set(values).size !== values.length) fail(`${label}的链接标识不能重复`);
  const albumIds = new Set(content.albums?.map(a => a.id));
  const placeIds = new Set(content.places?.map(p => p.id));
  for (const photo of content.photographs) if (photo.placeId && !placeIds.has(photo.placeId)) fail("照片归类的地点不存在，请重新选择");
  for (const photo of content.photographs) if (photo.albumId && !albumIds.has(photo.albumId)) fail("照片所属相册不存在，请重新选择");
  for (const album of content.albums ?? []) if (album.coverId && !content.photographs.some(p => p.id === album.coverId && p.albumId === album.id)) fail("相册封面必须是该相册中的照片");
  return content;
}

export function assetPath(path: string) {
  return path ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}` : "";
}
