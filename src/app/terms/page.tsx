import Link from 'next/link';
import { Bullets, LegalPage, Section } from '@/components/Legal';

export const metadata = { title: '使用條款 — 有空鴨' };

export default function TermsPage() {
  return (
    <LegalPage title="使用條款" updated="2026-08-29">
      <p>
        使用有空鴨（以下稱「本平台」）即表示你同意以下條款。請先讀第 1 點，
        它決定了本平台在你與對方之間扮演什麼角色。
      </p>

      <Section n="1." title="本平台是什麼、不是什麼">
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-ink">
          本平台是<span className="font-bold">資訊佈告與媒合工具</span>。
          你與對方之間的約定是你們自己的契約，本平台不是當事人、不是雇主、
          不是仲介，也不經手任何款項。
        </p>
        <Bullets
          items={[
            '本平台不代收、不代付、不保管薪資。報酬由雙方自行議定與給付。',
            '本平台不媒介外國人就業，亦不從事《就業服務法》所定私立就業服務機構之業務。',
            '本平台不保證任何工作機會的真實性、不保證對方會出現、不保證款項會付清。',
            '你與對方之間是否成立僱傭、承攬或其他關係，依你們的實際約定與法令認定，與本平台無關。',
          ]}
        />
      </Section>

      <Section n="2." title="帳號">
        <Bullets
          items={[
            '請提供真實資訊。冒用他人身分、以他人 Email 註冊，我們會停用帳號。',
            '一人一個帳號。帳號不得轉讓或出借。',
            '你要為自己帳號下的所有行為負責，請保管好密碼。',
            '未滿 18 歲須經法定代理人同意；未滿 15 歲不得使用。',
          ]}
        />
      </Section>

      <Section n="3." title="你發布的內容">
        <p>你必須對自己填寫的時段、服務、報價、工作內容的真實性負責。禁止：</p>
        <Bullets
          items={[
            '刊登不實資訊，或以明顯不合理的報酬吸引點閱',
            '刊登性交易、博弈、詐騙、代辦貸款、車手、代領包裹等違法或高風險工作',
            '要求對方先支付保證金、訓練費、押金、購買產品，或要求交付證件正本、存摺、提款卡',
            '刊登他人的個人資料，或未經同意公開對方的聯絡方式',
            '騷擾、歧視、威脅、跟蹤，或任何使對方感到不安全的行為',
          ]}
        />
        <p className="mt-2 rounded-xl bg-warn-bg px-4 py-3 text-warn">
          ⚠ 求職詐騙常見手法就是「先付錢」與「交出證件」。
          任何要求你先付款或交付證件正本的邀約，都請直接拒絕。
        </p>
      </Section>

      <Section n="4." title="聯絡方式與隱私">
        <p>
          手機與 LINE ID 預設不公開，需經你同意才會分享給特定對象。
          取得對方聯絡方式後，僅得用於該次合作聯繫，
          <span className="font-semibold text-ink">不得用於行銷、轉售或提供給第三人</span>。
        </p>
        <p>
          詳見<Link href="/privacy" className="font-semibold text-brand-600 underline underline-offset-2">隱私權政策</Link>。
        </p>
      </Section>

      <Section n="5." title="評價">
        <Bullets
          items={[
            '只有實際成立且時段已結束的委託，雙方才能互評，一次委託各評一次。',
            '評價送出後你無法自行修改或刪除。請先確認再送出。',
            '被評價的一方可以在該則評價下公開回應一次，回應同樣送出即定案。',
            '若經檢舉查證評價違反本條款（人身攻擊、洩漏個資、不實內容等），我們得將其隱藏，該則評分也不再計入星等。',
            '禁止以評價進行人身攻擊、洩漏個資，或以撤除負評作為交換條件。',
          ]}
        />
      </Section>

      <Section n="6." title="人身安全（請務必看）">
        <p>
          本平台無法查證任何使用者的身分，
          <span className="font-semibold text-ink">目前也沒有實名驗證機制</span>。與陌生人見面前請：
        </p>
        <Bullets
          items={[
            '告訴家人或朋友你要去哪裡、見誰、幾點回來',
            '第一次見面盡量約在公開場所，避免直接前往對方住處',
            '到府服務（清潔、照護、家教）前，先在站內訊息確認清楚工作內容與環境',
            '覺得不對勁就中止，不需要勉強完成',
          ]}
        />
      </Section>

      <Section n="7." title="我們可以做什麼">
        <p>
          若你違反本條款或法令，我們得移除相關內容、暫停或終止你的帳號，
          必要時配合司法機關調查。
        </p>
        <p className="text-ink-muted">
          說明：每個人的公開頁面下方都有
          <span className="font-semibold text-ink">檢舉</span>與
          <span className="font-semibold text-ink">封鎖</span>。檢舉會寄到
          <a href="mailto:freeduck.tw@gmail.com" className="font-semibold text-brand-600 underline underline-offset-2">freeduck.tw@gmail.com</a>
          由人工處理；封鎖則立即生效，你們不會再出現在彼此的搜尋結果，也無法互相邀約。
          我們不會即時審查所有內容。
        </p>
      </Section>

      <Section n="8." title="服務可用性與責任">
        <Bullets
          items={[
            '本服務以現況提供，可能因維護、故障或第三方服務中斷而暫停。',
            '我們不對使用者之間的糾紛、損害、款項未付或人身安全事故負責。',
            '在法律允許的最大範圍內，本平台不負擔間接、附隨或衍生的損害賠償責任。',
          ]}
        />
      </Section>

      <Section n="9." title="費用與廣告">
        <p>
          本服務目前
          <span className="font-semibold text-ink">完全免費，且沒有任何廣告</span>
          。日後如推出付費功能或刊登廣告：
        </p>
        <Bullets
          items={[
            '會事先於站內公告，並在收費前清楚標示價格與內容。',
            '既有的免費功能不會在未通知的情況下轉為付費。',
            '不會為了廣告投放而將你的個人資料販售或提供給廣告商。',
            '若採用會追蹤使用行為的廣告技術，會另行徵求你的同意，拒絕不影響媒合功能。',
          ]}
        />
      </Section>

      <Section n="10." title="條款修改與準據法">
        <p>
          條款修改後將於本頁公告。你在公告後繼續使用即視為同意。
          本條款以中華民國法律為準據法，因本服務所生爭議，
          以臺灣臺北地方法院為第一審管轄法院。
        </p>
      </Section>

      <Section n="11." title="聯絡我們">
        <p>營運者：有空鴨 FreeDuck</p>
        <p>聯絡信箱：<a href="mailto:freeduck.tw@gmail.com" className="font-semibold text-brand-600 underline underline-offset-2">freeduck.tw@gmail.com</a></p>
        <p className="text-ink-muted">
          本服務目前為免費、非營利之個人專案。日後如開始收費或以商業形式營運，
          將依法辦理登記，並於本頁揭露營運主體之正式名稱與登記資訊。
        </p>
      </Section>
    </LegalPage>
  );
}
