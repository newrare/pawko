import { BaseModal } from "./modal-base.js";
import { buttonHtml } from "./ui/button.js";
import { i18n } from "../managers/i18n-manager.js";
import { saveManager } from "../managers/save-manager.js";

/**
 * RankingModal — displays the player's best scores and levels reached.
 * Opened from the HUD bottom-left button (menu-ranking).
 */
export class RankingModal extends BaseModal {
  get title() {
    return i18n.t("hud.ranking.title");
  }

  renderBody() {
    const rankings = saveManager.getRankings("default");

    let content;
    if (rankings.length === 0) {
      content = `<p class="pk-rank-empty">${i18n.t("hud.ranking.empty")}</p>`;
    } else {
      let rows = "";
      rankings.forEach((entry, idx) => {
        const dateStr = entry.date
          ? new Date(entry.date).toLocaleDateString()
          : "—";
        const level = entry.level ?? "—";
        rows += `<tr>
          <td class="pk-rank-pos">#${idx + 1}</td>
          <td class="pk-rank-score">${entry.score ?? 0}</td>
          <td class="pk-rank-level">${i18n.t("hud.ranking.level", { n: level })}</td>
          <td class="pk-rank-date">${dateStr}</td>
        </tr>`;
      });
      content = `<table class="pk-rank-table">
        <thead><tr>
          <th></th>
          <th>${i18n.t("hud.ranking.col_score")}</th>
          <th>${i18n.t("hud.ranking.col_level")}</th>
          <th>${i18n.t("hud.ranking.col_date")}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    return `<div class="gt-stack">
      ${content}
      ${buttonHtml({ action: "close", label: i18n.t("menu.close"), variant: "ghost" })}
    </div>`;
  }
}
