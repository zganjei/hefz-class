import { i as __toESM } from "../_runtime.mjs";
import { n as require_react, t as useRender } from "../_libs/@base-ui/react+[...].mjs";
import { _ as createRootRouteWithContext, d as HeadContent, g as createFileRoute, h as lazyRouteComponent, m as Outlet, p as createRouter, u as Scripts, v as Link, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime, t as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as src_default } from "../_libs/postgres.mjs";
// node_modules/.nitro/vite/services/ssr/assets/router-CCJStHdf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Minimal class-name joiner. No tailwind-merge: components apply a single
*  composite `menu-*` class plus an optional caller `className`.
*/
function cx(...values) {
	return values.filter(Boolean).join(" ");
}
/**
* Variant/size → literal class strings. These literals (not a `q-button-${x}`
* template) are what Tailwind's scanner extracts from this file — see the
* `@source "./button.tsx"` in button.css — so every utility is generated.
* `satisfies Record<…>` makes the unions the single source of truth: adding a
* variant or size fails to compile until its class is registered here.
*/
var VARIANT_CLASS$2 = {
	primary: "q-button-primary",
	secondary: "q-button-secondary",
	tertiary: "q-button-tertiary",
	outline: "q-button-outline",
	ghost: "q-button-ghost",
	danger: "q-button-danger",
	dangerSoft: "q-button-danger-soft",
	brandSoft: "q-button-brand-soft",
	marketingPrimary: "q-button-marketing-primary",
	marketingSecondary: "q-button-marketing-secondary",
	marketingTertiary: "q-button-marketing-tertiary",
	marketingGhost: "q-button-marketing-ghost",
	specialBrand: "q-button-special-brand",
	specialPink: "q-button-special-pink"
};
var SIZE_CLASS$1 = {
	xxs: "q-button-xxs",
	xs: "q-button-xs",
	sm: "q-button-sm",
	md: "q-button-md",
	lg: "q-button-lg"
};
/** Marketing primary/secondary have no xxs (start at xs); glass variants keep xxs. */
var MARKETING_NO_XXS_VARIANTS = /* @__PURE__ */ new Set(["marketingPrimary", "marketingSecondary"]);
/** Build the button class string. Also usable to style non-button elements. */
function button(options = {}, ...extra) {
	const { variant = "primary", size = "sm", iconOnly = false } = options;
	const effectiveSize = size === "xxs" && MARKETING_NO_XXS_VARIANTS.has(variant) ? "xs" : size;
	return cx("q-button", VARIANT_CLASS$2[variant], SIZE_CLASS$1[effectiveSize], iconOnly && "q-button-icon-only", ...extra);
}
var VARIANT_CLASS$1 = {
	"accent-2xs-bold": "text-q-accent-2xs-bold",
	"accent-xs-bold": "text-q-accent-xs-bold",
	"accent-sm-bold": "text-q-accent-sm-bold",
	"accent-md-bold": "text-q-accent-md-bold",
	"accent-lg-bold": "text-q-accent-lg-bold",
	"accent-xl-bold": "text-q-accent-xl-bold",
	"accent-2xl-bold": "text-q-accent-2xl-bold",
	"accent-3xl-bold": "text-q-accent-3xl-bold",
	"accent-4xl-bold": "text-q-accent-4xl-bold",
	"accent-5xl-bold": "text-q-accent-5xl-bold",
	"accent-6xl-bold": "text-q-accent-6xl-bold",
	"body-sm-regular": "text-q-body-sm-regular",
	"body-sm-medium": "text-q-body-sm-medium",
	"body-sm-semi-bold": "text-q-body-sm-semi-bold",
	"body-md-regular": "text-q-body-md-regular",
	"body-md-medium": "text-q-body-md-medium",
	"body-md-semi-bold": "text-q-body-md-semi-bold",
	"body-lg-regular": "text-q-body-lg-regular",
	"body-lg-medium": "text-q-body-lg-medium",
	"body-lg-semi-bold": "text-q-body-lg-semi-bold",
	"caption-xs-regular": "text-q-caption-xs-regular",
	"caption-xs-medium": "text-q-caption-xs-medium",
	"caption-xs-semi-bold": "text-q-caption-xs-semi-bold",
	"caption-sm-regular": "text-q-caption-sm-regular",
	"caption-sm-medium": "text-q-caption-sm-medium",
	"caption-sm-semi-bold": "text-q-caption-sm-semi-bold",
	"display-sm-medium": "text-q-display-sm-medium",
	"display-sm-semi-bold": "text-q-display-sm-semi-bold",
	"display-sm-bold": "text-q-display-sm-bold",
	"display-md-medium": "text-q-display-md-medium",
	"display-md-semi-bold": "text-q-display-md-semi-bold",
	"display-md-bold": "text-q-display-md-bold",
	"display-lg-medium": "text-q-display-lg-medium",
	"display-lg-semi-bold": "text-q-display-lg-semi-bold",
	"display-lg-bold": "text-q-display-lg-bold",
	"headline-sm-medium": "text-q-headline-sm-medium",
	"headline-sm-semi-bold": "text-q-headline-sm-semi-bold",
	"headline-sm-bold": "text-q-headline-sm-bold",
	"headline-md-medium": "text-q-headline-md-medium",
	"headline-md-semi-bold": "text-q-headline-md-semi-bold",
	"headline-md-bold": "text-q-headline-md-bold",
	"headline-lg-medium": "text-q-headline-lg-medium",
	"headline-lg-semi-bold": "text-q-headline-lg-semi-bold",
	"headline-lg-bold": "text-q-headline-lg-bold",
	"label-xs-regular": "text-q-label-xs-regular",
	"label-xs-medium": "text-q-label-xs-medium",
	"label-xs-semi-bold": "text-q-label-xs-semi-bold",
	"label-xs-bold": "text-q-label-xs-bold",
	"label-sm-regular": "text-q-label-sm-regular",
	"label-sm-medium": "text-q-label-sm-medium",
	"label-sm-semi-bold": "text-q-label-sm-semi-bold",
	"label-sm-bold": "text-q-label-sm-bold",
	"label-md-regular": "text-q-label-md-regular",
	"label-md-medium": "text-q-label-md-medium",
	"label-md-semi-bold": "text-q-label-md-semi-bold",
	"label-md-bold": "text-q-label-md-bold",
	"label-lg-regular": "text-q-label-lg-regular",
	"label-lg-medium": "text-q-label-lg-medium",
	"label-lg-semi-bold": "text-q-label-lg-semi-bold",
	"label-lg-bold": "text-q-label-lg-bold",
	"mono-xs-regular": "text-q-mono-xs-regular",
	"mono-xs-medium": "text-q-mono-xs-medium",
	"mono-xs-semi-bold": "text-q-mono-xs-semi-bold",
	"mono-sm-regular": "text-q-mono-sm-regular",
	"mono-sm-medium": "text-q-mono-sm-medium",
	"mono-sm-semi-bold": "text-q-mono-sm-semi-bold",
	"mono-md-regular": "text-q-mono-md-regular",
	"mono-md-medium": "text-q-mono-md-medium",
	"mono-md-semi-bold": "text-q-mono-md-semi-bold",
	"mono-lg-regular": "text-q-mono-lg-regular",
	"mono-lg-medium": "text-q-mono-lg-medium",
	"mono-lg-semi-bold": "text-q-mono-lg-semi-bold",
	"title-sm-medium": "text-q-title-sm-medium",
	"title-sm-semi-bold": "text-q-title-sm-semi-bold",
	"title-sm-bold": "text-q-title-sm-bold",
	"title-md-medium": "text-q-title-md-medium",
	"title-md-semi-bold": "text-q-title-md-semi-bold",
	"title-md-bold": "text-q-title-md-bold",
	"title-lg-medium": "text-q-title-lg-medium",
	"title-lg-semi-bold": "text-q-title-lg-semi-bold",
	"title-lg-bold": "text-q-title-lg-bold"
};
var COLOR_CLASS = {
	primary: "text-q-text-primary",
	secondary: "text-q-text-secondary",
	tertiary: "text-q-text-tertiary",
	inverse: "text-q-text-inverse",
	disabled: "text-q-text-disabled",
	link: "text-q-text-link",
	brand: "text-q-text-brand",
	danger: "text-q-text-danger",
	success: "text-q-text-success",
	warning: "text-q-text-warning",
	info: "text-q-text-info",
	"on-overlay-secondary": "text-q-text-on-overlay-secondary",
	"on-overlay-tertiary": "text-q-text-on-overlay-tertiary"
};
/**
* Recipe — the class string for a given variant/color/truncate, so non-Typography
* elements (a Base UI part, an existing tag) can be styled identically:
* `<Trigger className={typography({ variant: 'label-md-semi-bold' })} />`.
*/
function typography(options = {}, ...extra) {
	const { variant = "body-md-regular", color, truncate } = options;
	return cx(VARIANT_CLASS$1[variant], color && COLOR_CLASS[color], truncate && "truncate", ...extra);
}
function Typography(props) {
	const { as, variant = "body-md-regular", color, truncate, className, ...rest } = props;
	return (0, import_react.createElement)(as ?? "p", {
		className: typography({
			variant,
			color,
			truncate
		}, className),
		...rest
	});
}
var SIZE_CLASS = {
	sm: "q-not-found-sm",
	md: "q-not-found-md",
	lg: "q-not-found-lg"
};
var VARIANT_CLASS = {
	plain: "q-not-found-plain",
	card: "q-not-found-card",
	outline: "q-not-found-outline"
};
var TITLE_VARIANT = {
	sm: "caption-xs-medium",
	md: "caption-sm-medium",
	lg: "body-sm-medium"
};
var SUBTITLE_VARIANT = {
	sm: "caption-xs-regular",
	md: "caption-sm-regular",
	lg: "body-sm-regular"
};
function NotFound({ icon, title, subtitle, actions, size = "md", variant = "plain", className, children, render, ref, ...props }) {
	return useRender({
		render,
		defaultTagName: "div",
		ref,
		props: {
			className: cx("q-not-found", SIZE_CLASS[size], VARIANT_CLASS[variant], className),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				icon != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "q-not-found-icon",
					children: icon
				}) : null,
				title != null || subtitle != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "q-not-found-text",
					children: [title != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						as: "span",
						variant: TITLE_VARIANT[size],
						color: "secondary",
						children: title
					}) : null, subtitle != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Typography, {
						as: "span",
						variant: SUBTITLE_VARIANT[size],
						color: "tertiary",
						children: subtitle
					}) : null]
				}) : null,
				actions != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "q-not-found-actions",
					children: actions
				}) : null,
				children
			] }),
			...props
		}
	});
}
var styles_default = "/assets/styles-Dw8z5AT3.css";
function reportHiggsfieldError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__higgsfieldEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var app_meta_default = {
	og_title: "همراه حفظ قرآن",
	og_description: "فضایی خصوصی برای همراهی حافظان قرآن و معلمان در مسیر حفظ، مرور و تثبیت آیات.",
	og_image_url: null,
	favicon_url: "/favicon.svg",
	og_video_url: null
};
var DEFAULT_TITLE = "Higgsfield App";
var DEFAULT_DESCRIPTION = "Higgsfield Generated Project";
var appMeta = app_meta_default;
var APP_HOST_ZONES = ["higgsfield.app", "higgsfield-dev.app"];
function toOwnAssetUrl(value) {
	if (!value) return null;
	if (value.startsWith("/")) return value;
	try {
		const u = new URL(value);
		if (APP_HOST_ZONES.some((zone) => u.hostname === zone || u.hostname.endsWith(`.${zone}`))) return u.pathname + u.search;
		return value;
	} catch {
		return value;
	}
}
function buildHead(meta) {
	const title = meta.og_title ?? DEFAULT_TITLE;
	const description = meta.og_description ?? DEFAULT_DESCRIPTION;
	const ogImage = toOwnAssetUrl(meta.og_image_url);
	const favicon = toOwnAssetUrl(meta.favicon_url);
	const ogVideo = toOwnAssetUrl(meta.og_video_url);
	return {
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title },
			{
				name: "description",
				content: description
			},
			{
				name: "author",
				content: "Higgsfield"
			},
			{
				property: "og:title",
				content: title
			},
			{
				property: "og:description",
				content: description
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: ogImage ? "summary_large_image" : "summary"
			},
			{
				name: "twitter:site",
				content: "@Higgsfield"
			},
			...ogImage ? [{
				property: "og:image",
				content: ogImage
			}, {
				name: "twitter:image",
				content: ogImage
			}] : [],
			...ogVideo ? [{
				property: "og:video",
				content: ogVideo
			}] : []
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, ...favicon ? [{
			rel: "icon",
			href: favicon
		}] : []]
	};
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-q-background-primary px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotFound, {
			className: "mx-auto max-w-md",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-q-title-md-semi-bold text-q-text-primary",
				children: "404"
			}),
			title: "Page not found",
			subtitle: "The page you're looking for doesn't exist or has been moved.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: button({
					variant: "primary",
					size: "md"
				}, "mt-3"),
				children: "Go home"
			})
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportHiggsfieldError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-q-background-primary px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-q-title-lg-semi-bold text-q-text-primary",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-q-body-sm-regular text-q-text-secondary",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: button({
							variant: "primary",
							size: "md"
						}),
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: button({
							variant: "outline",
							size: "md"
						}),
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$13 = createRootRouteWithContext()({
	head: () => buildHead(appMeta),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "fa",
		dir: "rtl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$13.useRouteContext();
	(0, import_react.useEffect)(() => {}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
var $$splitComponentImporter = () => import("./routes-VPqJ-jl4.mjs");
var Route$12 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route$11 = createFileRoute("/robots.txt")({ server: { handlers: { GET: async ({ request }) => {
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${new URL(request.url).origin}/sitemap.xml`
	].join("\n");
	return new Response(body, { headers: {
		"Content-Type": "text/plain; charset=utf-8",
		"Cache-Control": "public, max-age=86400"
	} });
} } } });
var Route$10 = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async ({ request }) => {
	const origin = new URL(request.url).origin;
	const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	const xml = [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		"<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
		"  <url>",
		`    <loc>${origin}/</loc>`,
		`    <lastmod>${today}</lastmod>`,
		"    <changefreq>weekly</changefreq>",
		"    <priority>1.0</priority>",
		"  </url>",
		"</urlset>"
	].join("\n");
	return new Response(xml, { headers: {
		"Content-Type": "application/xml; charset=utf-8",
		"Cache-Control": "public, max-age=3600"
	} });
} } } });
var client;
function getClient() {
	const url = process.env.DATABASE_URL;
	if (!url) return null;
	client ??= src_default(url, {
		max: 5,
		idle_timeout: 20,
		connect_timeout: 10,
		prepare: false
	});
	return client;
}
function toPostgres(query) {
	let index = 0;
	return query.replace(/\?/g, () => `$${++index}`);
}
function bindings() {
	const sql = getClient();
	if (!sql) return { BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET };
	return {
		DB: { prepare(query) {
			let values = [];
			const statement = {
				bind(...args) {
					values = args;
					return statement;
				},
				async first() {
					return (await sql.unsafe(toPostgres(query), values))[0] ?? null;
				},
				async all() {
					return { results: await sql.unsafe(toPostgres(query), values) };
				},
				async run() {
					return {
						success: true,
						meta: { changes: (await sql.unsafe(toPostgres(query), values)).count ?? 0 }
					};
				}
			};
			return statement;
		} },
		BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET
	};
}
var encoder = new TextEncoder();
var DAY = 86400;
function b64(bytes) {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64(value) {
	const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function hashPassword(password) {
	const salt = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
	const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits({
		name: "PBKDF2",
		hash: "SHA-256",
		salt,
		iterations: 21e4
	}, key, 256);
	return `pbkdf2:${b64(salt)}:${b64(new Uint8Array(bits))}`;
}
async function verifyPassword(password, stored) {
	const [scheme, saltText, hashText] = stored.split(":");
	if (scheme !== "pbkdf2" || !saltText || !hashText) return false;
	const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = new Uint8Array(await crypto.subtle.deriveBits({
		name: "PBKDF2",
		hash: "SHA-256",
		salt: fromB64(saltText),
		iterations: 21e4
	}, key, 256));
	const expected = fromB64(hashText);
	if (bits.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
	return diff === 0;
}
function jsonError(message, status = 400) {
	return Response.json({ error: message }, { status });
}
async function currentUser(request) {
	const token = request.headers.get("Cookie")?.split(";").map((x) => x.trim()).find((x) => x.startsWith("hifz_session="))?.slice(13);
	if (!token) return null;
	const { DB } = bindings();
	if (!DB) return null;
	return await DB.prepare("SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.active=1").bind(token, (/* @__PURE__ */ new Date()).toISOString()).first() ?? null;
}
function sessionCookie(token, maxAge = DAY * 14) {
	return `hifz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function login(request, email, password) {
	const { DB } = bindings();
	if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
	const user = await DB.prepare("SELECT id,email,display_name,role,password_hash FROM users WHERE email=? AND active=1").bind(email.toLowerCase()).first();
	if (!user || !await verifyPassword(password, user.password_hash)) return jsonError("ایمیل یا گذرواژه صحیح نیست.", 401);
	const token = crypto.randomUUID();
	const expires = new Date(Date.now() + DAY * 14 * 1e3).toISOString();
	await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(token, user.id, expires).run();
	const headers = new Headers({ "Set-Cookie": sessionCookie(token) });
	return Response.json({ user: {
		id: user.id,
		email: user.email,
		display_name: user.display_name,
		role: user.role
	} }, { headers });
}
async function registerWithInvite(request, body) {
	const { DB } = bindings();
	if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
	const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const password = typeof body.password === "string" ? body.password : "";
	const invitation = typeof body.invitation === "string" ? body.invitation : "";
	if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128 || !invitation) return jsonError("اطلاعات را بررسی کنید. گذرواژه باید دست‌کم ۱۰ نویسه باشد.");
	const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(invitation));
	const token = b64(new Uint8Array(tokenHash));
	const invite = await DB.prepare("SELECT id,email,role,class_id FROM invitations WHERE token_hash=? AND used_at IS NULL AND expires_at>?").bind(token, (/* @__PURE__ */ new Date()).toISOString()).first();
	if (!invite || invite.email.toLowerCase() !== email) return jsonError("دعوت‌نامه معتبر نیست یا منقضی شده است.", 403);
	const id = crypto.randomUUID();
	const passwordHash = await hashPassword(password);
	try {
		await DB.prepare("INSERT INTO users (id,email,display_name,password_hash,role) VALUES (?,?,?,?,?)").bind(id, email, name, passwordHash, invite.role).run();
		if (invite.class_id) await DB.prepare("INSERT INTO class_members (class_id,user_id) VALUES (?,?)").bind(invite.class_id, id).run();
		await DB.prepare("UPDATE invitations SET used_at=? WHERE id=?").bind((/* @__PURE__ */ new Date()).toISOString(), invite.id).run();
	} catch {
		return jsonError("این ایمیل قبلاً ثبت شده یا دعوت‌نامه قابل استفاده نیست.", 409);
	}
	const tokenId = crypto.randomUUID();
	await DB.prepare("INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)").bind(tokenId, id, new Date(Date.now() + DAY * 14 * 1e3).toISOString()).run();
	return Response.json({ user: {
		id,
		email,
		display_name: name,
		role: invite.role
	} }, { headers: { "Set-Cookie": sessionCookie(tokenId) } });
}
async function createInvitation(request, body) {
	const user = await currentUser(request);
	if (!user || !["admin", "teacher"].includes(user.role)) return jsonError("دسترسی مجاز نیست.", 403);
	const { DB } = bindings();
	const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
	const role = body.role;
	const classId = typeof body.classId === "string" ? body.classId : null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["teacher", "memorizer"].includes(String(role))) return jsonError("ایمیل یا نقش نامعتبر است.");
	if (user.role === "teacher" && role !== "memorizer") return jsonError("معلم فقط می‌تواند حافظ دعوت کند.", 403);
	if (classId) {
		const owned = await DB.prepare("SELECT id FROM classes WHERE id=? AND teacher_id=?").bind(classId, user.id).first();
		if (user.role === "teacher" && !owned) return jsonError("کلاس متعلق به شما نیست.", 403);
	}
	const raw = b64(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)));
	const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(raw)));
	await DB.prepare("INSERT INTO invitations (id,email,role,class_id,token_hash,expires_at,created_by) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), email, role, classId, b64(digest), new Date(Date.now() + DAY * 7 * 1e3).toISOString(), user.id).run();
	return Response.json({
		invitation: raw,
		expiresInDays: 7
	});
}
var Route$9 = createFileRoute("/api/assignments")({ server: { handlers: {
	GET: async ({ request }) => {
		const user = await currentUser(request);
		if (!user) return jsonError("ابتدا وارد شوید.", 401);
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		let result;
		if (user.role === "admin") result = await DB.prepare("SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id ORDER BY a.created_at DESC LIMIT 100").all();
		else if (user.role === "teacher") result = await DB.prepare("SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=? ORDER BY a.created_at DESC LIMIT 100").bind(user.id).all();
		else result = await DB.prepare("SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? ORDER BY a.created_at DESC LIMIT 100").bind(user.id).all();
		return Response.json({ assignments: result.results });
	},
	POST: async ({ request }) => {
		const user = await currentUser(request);
		if (!user || !["admin", "teacher"].includes(user.role)) return jsonError("فقط معلم یا مدیر می‌تواند برنامه تعیین کند.", 403);
		const body = await request.json().catch(() => null);
		const classId = typeof body?.classId === "string" ? body.classId : "", title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "", surah = typeof body?.surah === "string" ? body.surah.trim().slice(0, 80) : "";
		const from = Number(body?.fromAyah), to = Number(body?.toAyah), due = typeof body?.dueDate === "string" ? body.dueDate : null, notes = typeof body?.instructions === "string" ? body.instructions.slice(0, 1e3) : "";
		if (!classId || !title || !surah || !Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > 286) return jsonError("اطلاعات برنامه نامعتبر است.");
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		const cls = await DB.prepare("SELECT id,teacher_id FROM classes WHERE id=?").bind(classId).first();
		if (!cls || user.role === "teacher" && cls.teacher_id !== user.id) return jsonError("کلاس پیدا نشد یا دسترسی ندارید.", 403);
		const id = crypto.randomUUID();
		await DB.prepare("INSERT INTO assignments(id,class_id,title,surah,from_ayah,to_ayah,due_date,instructions,created_by) VALUES(?,?,?,?,?,?,?,?,?)").bind(id, classId, title, surah, from, to, due, notes, user.id).run();
		return Response.json({ id }, { status: 201 });
	}
} } });
var enc = new TextEncoder();
function constantEqual(a, b) {
	if (a.length !== b.length) return false;
	let d = 0;
	for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
	return d === 0;
}
var Route$8 = createFileRoute("/api/bootstrap")({ server: { handlers: {
	GET: async () => {
		const { DB, BOOTSTRAP_SECRET } = bindings();
		if (!DB) return Response.json({
			ready: false,
			configured: false
		});
		const count = await DB.prepare("SELECT COUNT(*) AS n FROM users").first();
		return Response.json({
			ready: Number(count?.n ?? 0) === 0,
			configured: !!BOOTSTRAP_SECRET
		});
	},
	POST: async ({ request }) => {
		const { DB, BOOTSTRAP_SECRET } = bindings();
		if (!DB || !BOOTSTRAP_SECRET) return jsonError("راه‌اندازی اولیه هنوز پیکربندی نشده است.", 503);
		const count = await DB.prepare("SELECT COUNT(*) AS n FROM users").first();
		if (Number(count?.n ?? 0) > 0) return jsonError("مدیر اولیه قبلاً ساخته شده است.", 409);
		const body = await request.json().catch(() => null);
		if (!body || typeof body.secret !== "string" || typeof body.name !== "string" || typeof body.email !== "string" || typeof body.password !== "string") return jsonError("اطلاعات ناقص است.");
		const a = enc.encode(body.secret), b = enc.encode(BOOTSTRAP_SECRET);
		if (a.length !== b.length || !constantEqual(a, b)) return jsonError("کد راه‌اندازی نادرست است.", 403);
		const email = body.email.trim().toLowerCase(), name = body.name.trim(), password = body.password;
		if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) return jsonError("نام، ایمیل یا گذرواژه نامعتبر است.");
		const salt = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
		const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
		const hash = new Uint8Array(await crypto.subtle.deriveBits({
			name: "PBKDF2",
			hash: "SHA-256",
			salt,
			iterations: 21e4
		}, key, 256));
		const b64 = (v) => btoa(String.fromCharCode(...v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		const id = crypto.randomUUID();
		await DB.prepare("INSERT INTO users(id,email,display_name,password_hash,role) VALUES(?,?,?,?, 'admin')").bind(id, email, name, `pbkdf2:${b64(salt)}:${b64(hash)}`).run();
		const token = crypto.randomUUID();
		await DB.prepare("INSERT INTO sessions(id,user_id,expires_at) VALUES(?,?,?)").bind(token, id, new Date(Date.now() + 12096e5).toISOString()).run();
		return Response.json({ ok: true }, { headers: { "Set-Cookie": `hifz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600` } });
	}
} } });
var Route$7 = createFileRoute("/api/classes")({ server: { handlers: {
	GET: async ({ request }) => {
		const user = await currentUser(request);
		if (!user) return jsonError("ابتدا وارد شوید.", 401);
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		if (user.role === "admin") {
			const rows = await DB.prepare("SELECT c.*,u.display_name AS teacher_name,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count FROM classes c JOIN users u ON u.id=c.teacher_id ORDER BY c.created_at DESC").all();
			return Response.json({ classes: rows.results });
		}
		if (user.role === "teacher") {
			const rows = await DB.prepare("SELECT c.*,(SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id) AS member_count FROM classes c WHERE c.teacher_id=? ORDER BY c.created_at DESC").bind(user.id).all();
			return Response.json({ classes: rows.results });
		}
		const rows = await DB.prepare("SELECT c.id,c.name,c.description,u.display_name AS teacher_name FROM classes c JOIN class_members m ON m.class_id=c.id JOIN users u ON u.id=c.teacher_id WHERE m.user_id=? ORDER BY c.name").bind(user.id).all();
		return Response.json({ classes: rows.results });
	},
	POST: async ({ request }) => {
		const user = await currentUser(request);
		if (!user || !["admin", "teacher"].includes(user.role)) return jsonError("دسترسی مجاز نیست.", 403);
		const body = await request.json().catch(() => null);
		const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
		let teacherId = user.role === "teacher" ? user.id : typeof body?.teacherId === "string" ? body.teacherId : "";
		if (user.role === "admin" && !teacherId) teacherId = (await bindings().DB?.prepare("SELECT id FROM users WHERE role='teacher' AND active=1 ORDER BY created_at LIMIT 1").first())?.id ?? "";
		if (!name || !teacherId) return jsonError("نام کلاس و معلم را مشخص کنید.");
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		if (!await DB.prepare("SELECT id FROM users WHERE id=? AND role='teacher' AND active=1").bind(teacherId).first()) return jsonError("معلم انتخاب‌شده معتبر نیست.");
		const id = crypto.randomUUID();
		await DB.prepare("INSERT INTO classes(id,name,description,teacher_id) VALUES(?,?,?,?)").bind(id, name, typeof body?.description === "string" ? body.description.slice(0, 500) : "", teacherId).run();
		return Response.json({
			id,
			name
		}, { status: 201 });
	}
} } });
var Route$6 = createFileRoute("/api/invitations")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) return jsonError("درخواست نامعتبر است.");
	return createInvitation(request, body);
} } } });
var Route$5 = createFileRoute("/api/reports")({ server: { handlers: {
	GET: async ({ request }) => {
		const user = await currentUser(request);
		if (!user) return jsonError("ابتدا وارد شوید.", 401);
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		let rows;
		if (user.role === "admin") rows = await DB.prepare("SELECT r.*,u.display_name, c.name AS class_name FROM reports r JOIN users u ON u.id=r.user_id JOIN classes c ON c.id=r.class_id ORDER BY r.submitted_at DESC LIMIT 100").all();
		else if (user.role === "teacher") rows = await DB.prepare("SELECT r.*,u.display_name,c.name AS class_name FROM reports r JOIN users u ON u.id=r.user_id JOIN classes c ON c.id=r.class_id WHERE c.teacher_id=? ORDER BY r.submitted_at DESC LIMIT 100").bind(user.id).all();
		else rows = await DB.prepare("SELECT r.*,c.name AS class_name FROM reports r JOIN classes c ON c.id=r.class_id WHERE r.user_id=? ORDER BY r.submitted_at DESC LIMIT 100").bind(user.id).all();
		return Response.json({ reports: rows.results });
	},
	POST: async ({ request }) => {
		const user = await currentUser(request);
		if (!user || user.role !== "memorizer") return jsonError("فقط حافظ می‌تواند گزارش ثبت کند.", 403);
		const body = await request.json().catch(() => null);
		const classId = typeof body?.classId === "string" ? body.classId : "", surah = typeof body?.surah === "string" ? body.surah.trim().slice(0, 80) : "";
		const from = Number(body?.fromAyah), to = Number(body?.toAyah), note = typeof body?.note === "string" ? body.note.slice(0, 1e3) : "";
		if (!classId || !surah || !Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > 286) return jsonError("اطلاعات گزارش نامعتبر است.");
		const { DB } = bindings();
		if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
		if (!await DB.prepare("SELECT 1 FROM class_members WHERE class_id=? AND user_id=?").bind(classId, user.id).first()) return jsonError("شما عضو این کلاس نیستید.", 403);
		const id = crypto.randomUUID();
		await DB.prepare("INSERT INTO reports(id,user_id,class_id,surah,from_ayah,to_ayah,note) VALUES(?,?,?,?,?,?,?)").bind(id, user.id, classId, surah, from, to, note).run();
		return Response.json({
			id,
			status: "pending"
		}, { status: 201 });
	}
} } });
var Route$4 = createFileRoute("/api/auth/login")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body.email !== "string" || typeof body.password !== "string") return jsonError("اطلاعات ورود ناقص است.");
	return login(request, body.email, body.password);
} } } });
var Route$3 = createFileRoute("/api/auth/logout")({ server: { handlers: { POST: async ({ request }) => {
	const token = request.headers.get("Cookie")?.split(";").map((x) => x.trim()).find((x) => x.startsWith("hifz_session="))?.slice(13);
	const { DB } = bindings();
	if (token && DB) await DB.prepare("DELETE FROM sessions WHERE id=?").bind(token).run();
	return Response.json({ ok: true }, { headers: { "Set-Cookie": "hifz_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" } });
} } } });
var Route$2 = createFileRoute("/api/auth/me")({ server: { handlers: { GET: async ({ request }) => {
	return Response.json({ user: await currentUser(request) });
} } } });
var Route$1 = createFileRoute("/api/auth/register")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body) return jsonError("درخواست نامعتبر است.");
	return registerWithInvite(request, body);
} } } });
var Route = createFileRoute("/api/reports/review")({ server: { handlers: { POST: async ({ request }) => {
	const user = await currentUser(request);
	if (!user || !["admin", "teacher"].includes(user.role)) return jsonError("دسترسی مجاز نیست.", 403);
	const body = await request.json().catch(() => null);
	const id = typeof body?.id === "string" ? body.id : "", status = body?.status, feedback = typeof body?.feedback === "string" ? body.feedback.slice(0, 1e3) : "";
	if (!id || !["approved", "needs_revision"].includes(String(status))) return jsonError("وضعیت بررسی نامعتبر است.");
	const { DB } = bindings();
	if (!DB) return jsonError("پایگاه داده آماده نیست.", 503);
	const report = await DB.prepare("SELECT r.id,c.teacher_id FROM reports r JOIN classes c ON c.id=r.class_id WHERE r.id=?").bind(id).first();
	if (!report || user.role === "teacher" && report.teacher_id !== user.id) return jsonError("گزارش پیدا نشد یا دسترسی ندارید.", 404);
	await DB.prepare("UPDATE reports SET status=?,feedback=?,reviewed_by=?,reviewed_at=? WHERE id=?").bind(status, feedback, user.id, (/* @__PURE__ */ new Date()).toISOString(), id).run();
	return Response.json({ ok: true });
} } } });
var IndexRoute = Route$12.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$13
});
var RobotsDottxtRoute = Route$11.update({
	id: "/robots.txt",
	path: "/robots.txt",
	getParentRoute: () => Route$13
});
var SitemapDotxmlRoute = Route$10.update({
	id: "/sitemap.xml",
	path: "/sitemap.xml",
	getParentRoute: () => Route$13
});
var ApiAssignmentsRoute = Route$9.update({
	id: "/api/assignments",
	path: "/api/assignments",
	getParentRoute: () => Route$13
});
var ApiBootstrapRoute = Route$8.update({
	id: "/api/bootstrap",
	path: "/api/bootstrap",
	getParentRoute: () => Route$13
});
var ApiClassesRoute = Route$7.update({
	id: "/api/classes",
	path: "/api/classes",
	getParentRoute: () => Route$13
});
var ApiInvitationsRoute = Route$6.update({
	id: "/api/invitations",
	path: "/api/invitations",
	getParentRoute: () => Route$13
});
var ApiReportsRoute = Route$5.update({
	id: "/api/reports",
	path: "/api/reports",
	getParentRoute: () => Route$13
});
var ApiAuthLoginRoute = Route$4.update({
	id: "/api/auth/login",
	path: "/api/auth/login",
	getParentRoute: () => Route$13
});
var ApiAuthLogoutRoute = Route$3.update({
	id: "/api/auth/logout",
	path: "/api/auth/logout",
	getParentRoute: () => Route$13
});
var ApiAuthMeRoute = Route$2.update({
	id: "/api/auth/me",
	path: "/api/auth/me",
	getParentRoute: () => Route$13
});
var ApiAuthRegisterRoute = Route$1.update({
	id: "/api/auth/register",
	path: "/api/auth/register",
	getParentRoute: () => Route$13
});
var ApiReportsRouteChildren = { ApiReportsReviewRoute: Route.update({
	id: "/review",
	path: "/review",
	getParentRoute: () => ApiReportsRoute
}) };
var rootRouteChildren = {
	IndexRoute,
	RobotsDottxtRoute,
	SitemapDotxmlRoute,
	ApiAssignmentsRoute,
	ApiBootstrapRoute,
	ApiClassesRoute,
	ApiInvitationsRoute,
	ApiReportsRoute: ApiReportsRoute._addFileChildren(ApiReportsRouteChildren),
	ApiAuthLoginRoute,
	ApiAuthLogoutRoute,
	ApiAuthMeRoute,
	ApiAuthRegisterRoute
};
var routeTree = Route$13._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
export { getRouter };
