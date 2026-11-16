import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@base-ui/react+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
// node_modules/.nitro/vite/services/ssr/assets/routes-VPqJ-jl4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var roleName = {
	admin: "مدیر",
	teacher: "معلم",
	memorizer: "حافظ"
};
var statusName = {
	pending: "در انتظار بررسی",
	approved: "تأیید شده",
	needs_revision: "نیاز به مرور"
};
async function api(path, body, method = "POST") {
	const r = await fetch(path, {
		method,
		headers: body ? { "Content-Type": "application/json" } : void 0,
		body: body ? JSON.stringify(body) : void 0
	});
	const d = await r.json().catch(() => ({ error: "پاسخ نامعتبر" }));
	if (!r.ok) throw new Error(d.error || "خطا");
	return d;
}
function Home() {
	const [user, setUser] = (0, import_react.useState)(null), [setup, setSetup] = (0, import_react.useState)(null), [mode, setMode] = (0, import_react.useState)("login"), [name, setName] = (0, import_react.useState)(""), [email, setEmail] = (0, import_react.useState)(""), [password, setPassword] = (0, import_react.useState)(""), [secret, setSecret] = (0, import_react.useState)(""), [invitation, setInvitation] = (0, import_react.useState)(""), [message, setMessage] = (0, import_react.useState)(""), [busy, setBusy] = (0, import_react.useState)(false);
	const [classes, setClasses] = (0, import_react.useState)([]), [reports, setReports] = (0, import_react.useState)([]), [assignments, setAssignments] = (0, import_react.useState)([]), [tab, setTab] = (0, import_react.useState)("overview"), [className, setClassName] = (0, import_react.useState)(""), [assignmentTitle, setAssignmentTitle] = (0, import_react.useState)(""), [assignmentSurah, setAssignmentSurah] = (0, import_react.useState)("ملک"), [assignmentFrom, setAssignmentFrom] = (0, import_react.useState)("1"), [assignmentTo, setAssignmentTo] = (0, import_react.useState)("5"), [assignmentClass, setAssignmentClass] = (0, import_react.useState)(""), [assignmentDue, setAssignmentDue] = (0, import_react.useState)(""), [inviteEmail, setInviteEmail] = (0, import_react.useState)(""), [inviteRole, setInviteRole] = (0, import_react.useState)("memorizer"), [inviteClass, setInviteClass] = (0, import_react.useState)(""), [inviteCode, setInviteCode] = (0, import_react.useState)("");
	const [surah, setSurah] = (0, import_react.useState)("ملک"), [from, setFrom] = (0, import_react.useState)("1"), [to, setTo] = (0, import_react.useState)("5"), [classId, setClassId] = (0, import_react.useState)(""), [note, setNote] = (0, import_react.useState)(""), [feedback, setFeedback] = (0, import_react.useState)({});
	const load = async () => {
		const m = await api("/api/auth/me", void 0, "GET");
		setUser(m.user);
		if (m.user) {
			const x = await Promise.all([
				api("/api/classes", void 0, "GET"),
				api("/api/reports", void 0, "GET"),
				api("/api/assignments", void 0, "GET")
			]);
			setClasses(x[0].classes || []);
			setReports(x[1].reports || []);
			setAssignments(x[2].assignments || []);
		}
	};
	(0, import_react.useEffect)(() => {
		api("/api/bootstrap", void 0, "GET").then(setSetup).catch(() => {});
		load().catch(() => {});
	}, []);
	const run = async (fn) => {
		setBusy(true);
		setMessage("");
		try {
			await fn();
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "خطا");
		} finally {
			setBusy(false);
		}
	};
	const auth = () => run(async () => {
		if (mode === "setup") await api("/api/bootstrap", {
			secret,
			name,
			email,
			password
		});
		else if (mode === "register") await api("/api/auth/register", {
			name,
			email,
			password,
			invitation
		});
		else await api("/api/auth/login", {
			email,
			password
		});
		setPassword("");
		await load();
	});
	const createAssignment = () => run(async () => {
		await api("/api/assignments", {
			classId: assignmentClass,
			title: assignmentTitle,
			surah: assignmentSurah,
			fromAyah: Number(assignmentFrom),
			toAyah: Number(assignmentTo),
			dueDate: assignmentDue || null
		});
		setAssignmentTitle("");
		await load();
	});
	const invite = () => run(async () => {
		const x = await api("/api/invitations", {
			email: inviteEmail,
			role: inviteRole,
			classId: inviteClass || null
		});
		setInviteCode(x.invitation);
	});
	const submitReport = () => run(async () => {
		await api("/api/reports", {
			classId,
			surah,
			fromAyah: Number(from),
			toAyah: Number(to),
			note
		});
		setNote("");
		await load();
	});
	const review = (r, status) => run(async () => {
		await api("/api/reports/review", {
			id: r.id,
			status,
			feedback: feedback[r.id] || ""
		});
		await load();
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "auth-screen",
		dir: "rtl",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "auth-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "brand-mark auth-mark",
					children: "ح"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "eyebrow",
					children: "فضای خصوصی گروه شما"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "همراه حفظ قرآن" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "auth-intro",
					children: "محیطی آرام برای پیگیری حفظ و ارتباط با معلم"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "auth-tabs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setMode("login"),
							className: mode === "login" ? "active" : "",
							children: "ورود"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setMode("register"),
							className: mode === "register" ? "active" : "",
							children: "ثبت‌نام با دعوت"
						}),
						setup?.ready && setup?.configured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setMode("setup"),
							className: mode === "setup" ? "active" : "",
							children: "مدیر اولیه"
						})
					]
				}),
				(mode === "setup" || mode === "register") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [mode === "setup" ? "کد راه‌اندازی" : "کد دعوت‌نامه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "password",
					value: mode === "setup" ? secret : invitation,
					onChange: (e) => mode === "setup" ? setSecret(e.target.value) : setInvitation(e.target.value)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["نام و نام خانوادگی", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: name,
					onChange: (e) => setName(e.target.value)
				})] })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["ایمیل", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "email",
					value: email,
					onChange: (e) => setEmail(e.target.value)
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["گذرواژه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "password",
					value: password,
					onChange: (e) => setPassword(e.target.value)
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					className: "primary-wide",
					disabled: busy || !setup,
					onClick: () => void auth(),
					children: busy ? "لطفاً صبر کنید" : mode === "setup" ? "ساخت حساب مدیر" : mode === "register" ? "ثبت‌نام و ورود" : "ورود به حساب"
				}),
				setup?.ready && !setup?.configured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "hint",
					children: "برای فعال‌سازی مدیر اولیه، کلید BOOTSTRAP_SECRET باید در تنظیمات سایت ثبت شود."
				}),
				message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "error-msg",
					children: message
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
					className: "auth-foot",
					children: "عضویت فقط با دعوت‌نامه امکان‌پذیر است."
				})
			]
		})
	});
	const nav = [
		["overview", "نمای کلی"],
		["classes", "کلاس‌ها"],
		["reports", "گزارش‌های حفظ"],
		["members", "دعوت اعضا"]
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "app-shell",
		dir: "rtl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "sidebar",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "brand",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "brand-mark",
						children: "ح"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "همراه حفظ قرآن" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "همراه مسیر نور" })] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "profile-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "avatar",
							children: user.display_name.slice(0, 1)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "profile-copy",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: user.display_name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: roleName[user.role] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "logout",
							onClick: () => void run(async () => {
								await api("/api/auth/logout", {});
								setUser(null);
							}),
							children: "خروج"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "side-nav",
					children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: tab === n[0] ? "nav-item selected" : "nav-item",
						onClick: () => setTab(n[0]),
						children: n[1]
					}, n[0]))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "sidebar-bottom",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "verse-card",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "verse-ornament",
								children: "۞"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "سوره قمر، آیه ۱۷" })
						]
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "workspace",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "topbar",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "breadcrumbs",
					children: [
						"همراه حفظ قرآن ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "/" }),
						" ",
						nav.find((n) => n[0] === tab)?.[1]
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "role-pill",
					children: roleName[user.role]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "page-content",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "welcome-row",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "eyebrow",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}), " یک قدم نزدیک‌تر به آیات الهی"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
								"السلام علیکم، ",
								user.display_name,
								" 🌿"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "welcome-sub",
								children: "امروز هم فرصتی تازه برای مرور و تثبیت آیات است."
							})
						] })
					}),
					message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "error-msg",
						children: message
					}),
					tab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "summary-grid",
						children: [
							["کلاس‌های من", classes.length],
							["گزارش‌های ثبت‌شده", reports.length],
							["در انتظار بررسی", reports.filter((r) => r.status === "pending").length],
							["تأییدشده", reports.filter((r) => r.status === "approved").length]
						].map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "summary-card",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "stat-top",
								children: x[0]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "stat-number",
								children: x[1]
							})]
						}, x[0]))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "panel-heading",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "آخرین گزارش‌ها" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "text-action",
									onClick: () => setTab("reports"),
									children: "همه گزارش‌ها ←"
								})]
							}),
							reports.slice(0, 5).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "simple-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
									r.surah,
									"، آیات ",
									r.from_ayah,
									" تا ",
									r.to_ayah
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
									className: "status " + r.status,
									children: statusName[r.status]
								})]
							}, r.id)),
							!reports.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "empty-state",
								children: "هنوز گزارشی ثبت نشده است."
							})
						]
					})] }),
					tab === "classes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "کلاس‌های من" }),
							["admin", "teacher"].includes(user.role) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-form",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									placeholder: "نام کلاس جدید",
									value: className,
									onChange: (e) => setClassName(e.target.value)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									disabled: busy || !className.trim(),
									onClick: () => void run(async () => {
										await api("/api/classes", { name: className });
										setClassName("");
										await load();
									}),
									children: "ایجاد کلاس"
								})]
							}),
							classes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "simple-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: c.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c.teacher_name || String(c.member_count || 0) + " عضو" })]
							}, c.id)),
							!classes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "empty-state",
								children: "هنوز کلاسی ایجاد یا به شما اختصاص داده نشده است."
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "برنامه‌های حفظ" }),
							["admin", "teacher"].includes(user.role) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "report-form",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["کلاس", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: assignmentClass,
										onChange: (e) => setAssignmentClass(e.target.value),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "انتخاب کلاس"
										}), classes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: c.id,
											children: c.name
										}, c.id))]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["عنوان برنامه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: assignmentTitle,
										onChange: (e) => setAssignmentTitle(e.target.value),
										placeholder: "مثلاً حفظ و مرور هفته"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["سوره", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: assignmentSurah,
										onChange: (e) => setAssignmentSurah(e.target.value)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "form-pair",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["از آیه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											value: assignmentFrom,
											onChange: (e) => setAssignmentFrom(e.target.value)
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["تا آیه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											value: assignmentTo,
											onChange: (e) => setAssignmentTo(e.target.value)
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["تاریخ انجام", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "date",
										value: assignmentDue,
										onChange: (e) => setAssignmentDue(e.target.value)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: "primary-wide",
										disabled: busy || !assignmentClass || !assignmentTitle.trim(),
										onClick: () => void createAssignment(),
										children: "ثبت برنامه برای کلاس"
									})
								]
							}),
							assignments.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "simple-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
									a.title,
									" · ",
									a.surah,
									" ",
									a.from_ayah,
									"–",
									a.to_ayah
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									a.class_name,
									" ",
									a.due_date || ""
								] })]
							}, a.id)),
							!assignments.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "empty-state",
								children: "هنوز برنامه‌ای ثبت نشده است."
							})
						]
					})] }),
					tab === "members" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "دعوت اعضا" }), user.role === "memorizer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "empty-state",
							children: "دعوت اعضا فقط برای مدیر و معلم فعال است."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "field-label",
								children: ["ایمیل عضو", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "email",
									value: inviteEmail,
									onChange: (e) => setInviteEmail(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-form",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: inviteRole,
										onChange: (e) => setInviteRole(e.target.value),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "memorizer",
											children: "حافظ"
										}), user.role === "admin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "teacher",
											children: "معلم"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: inviteClass,
										onChange: (e) => setInviteClass(e.target.value),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "بدون کلاس"
										}), classes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: c.id,
											children: c.name
										}, c.id))]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										disabled: busy || !inviteEmail,
										onClick: () => void invite(),
										children: "ساخت دعوت‌نامه"
									})
								]
							}),
							inviteCode && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "invite-result",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "کد دعوت، معتبر به مدت ۷ روز:" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: inviteCode }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => void navigator.clipboard.writeText(inviteCode),
										children: "کپی کد"
									})
								]
							})
						] })]
					}),
					tab === "reports" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: user.role === "memorizer" ? "ثبت گزارش حفظ" : "گزارش‌های کلاس‌ها" }), user.role === "memorizer" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "report-form",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["کلاس", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: classId,
									onChange: (e) => setClassId(e.target.value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "انتخاب کلاس"
									}), classes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: c.id,
										children: c.name
									}, c.id))]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["سوره", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: surah,
									onChange: (e) => setSurah(e.target.value)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "form-pair",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["از آیه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: "1",
										value: from,
										onChange: (e) => setFrom(e.target.value)
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["تا آیه", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: "1",
										value: to,
										onChange: (e) => setTo(e.target.value)
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: ["یادداشت برای معلم", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									value: note,
									onChange: (e) => setNote(e.target.value)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "primary-wide",
									disabled: busy || !classId,
									onClick: () => void submitReport(),
									children: "ارسال گزارش"
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "panel reports-panel",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "سوابق گزارش‌ها" }),
							reports.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "report-entry",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "report-entry-head",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
											r.surah,
											"، آیات ",
											r.from_ayah,
											" تا ",
											r.to_ayah
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
											className: "status " + r.status,
											children: statusName[r.status]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
										r.class_name,
										" ",
										r.display_name ? " · " + r.display_name : "",
										" · ",
										new Date(r.submitted_at).toLocaleDateString("fa-IR")
									] }),
									r.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: r.note }),
									r.feedback && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "feedback",
										children: ["بازخورد معلم: ", r.feedback]
									}),
									["admin", "teacher"].includes(user.role) && r.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "review-controls",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												placeholder: "بازخورد برای حافظ",
												value: feedback[r.id] || "",
												onChange: (e) => setFeedback((v) => ({
													...v,
													[r.id]: e.target.value
												}))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => void review(r, "approved"),
												children: "تأیید"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												className: "secondary-action",
												onClick: () => void review(r, "needs_revision"),
												children: "نیاز به مرور"
											})
										]
									})
								]
							}, r.id)),
							!reports.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "empty-state",
								children: "گزارشی برای نمایش وجود ندارد."
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
						className: "footer-note",
						children: ["«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "بهترین شما کسی است که قرآن را بیاموزد و آموزش دهد." })]
					})
				]
			})]
		})]
	});
}
export { Home as component };
