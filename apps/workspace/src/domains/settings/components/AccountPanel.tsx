import { ChartNoAxesCombined, CreditCard, LogIn, RefreshCw, UserRound, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSettingsNavigationStore } from "@/lib/stores/settings";
import { SettingsPanelLayout } from "./SettingsPanelLayout";

export function AccountPanel() {
	const setActiveTab = useSettingsNavigationStore((state) => state.setActiveTab);
	return (
		<SettingsPanelLayout title="账户" icon={<UserRound className="size-4" />}>
			<div className="max-w-3xl space-y-6">
				<div className="flex flex-wrap items-center gap-3 rounded-md bg-ide-list-active p-4">
					<UserRound className="size-5 shrink-0 text-primary" />
					<div className="min-w-0 flex-1 basis-48 space-y-1">
						<p className="text-sm font-semibold">本地用户 · 未登录</p>
						<p className="text-xs leading-5 text-muted-foreground">
							当前使用本地工作区。账户登录与会员权益服务【待接入】。
						</p>
					</div>
					<Button variant="secondary" size="sm" disabled title="账户认证服务待接入">
						<LogIn />
						登录
					</Button>
				</div>
				<section className="space-y-4" aria-labelledby="account-membership-heading">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0 space-y-1">
							<h3 id="account-membership-heading" className="text-sm font-semibold">
								会员与积分
							</h3>
							<p className="text-xs leading-5 text-muted-foreground">
								【待接入】会员、积分余额与到期信息尚未连接账户服务。
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button variant="ghost" size="sm" disabled title="权益查询服务待接入">
								<RefreshCw />
								刷新
							</Button>
							<Button variant="outline" size="sm" disabled title="积分与支付服务待接入">
								<Wallet />
								充值积分
							</Button>
							<Button size="sm" disabled title="会员与支付服务待接入">
								<CreditCard />
								开通会员
							</Button>
						</div>
					</div>
					<dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
						{[
							{ label: "当前版本", value: "本地模式" },
							{ label: "项目上限", value: "本地不限额" },
							{ label: "可用积分", value: "待接入" },
							{ label: "会员到期", value: "待接入" },
						].map((item) => (
							<div key={item.label} className="min-w-0 rounded-md bg-ide-sidebar p-4">
								<dt className="text-xs text-muted-foreground">{item.label}</dt>
								<dd className="mt-2 break-words text-sm font-semibold">{item.value}</dd>
							</div>
						))}
					</dl>
				</section>
				<section
					className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"
					aria-labelledby="account-local-usage-heading"
				>
					<div className="min-w-0 space-y-1">
						<h3 id="account-local-usage-heading" className="text-sm font-semibold">
							本地用量
						</h3>
						<p className="text-xs leading-5 text-muted-foreground">
							本地记录的调用、Token 与费用不代表账户积分余额。
						</p>
					</div>
					<Button variant="outline" size="sm" onClick={() => setActiveTab("billing")}>
						<ChartNoAxesCombined />
						查看用量
					</Button>
				</section>
			</div>
		</SettingsPanelLayout>
	);
}
