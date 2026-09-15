import type { Metadata } from 'next';
import { Bullets, LegalPage, Section } from '@/components/Legal';

export const metadata: Metadata = {
  title: '隱私權政策',
  description: '有空鴨蒐集哪些資料、怎麼用、你可以怎麼要求刪除。',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="隱私權政策" updated="2026-08-29">
      <p>
        有空鴨（以下稱「本平台」）依《個人資料保護法》告知你：我們蒐集了什麼、為什麼蒐集、
        存在哪裡、你可以怎麼要求我們處理。這份文件描述的是本平台實際的做法，不是通用模板。
      </p>

      <Section n="1." title="我們蒐集哪些資料">
        <p className="font-semibold text-ink">你主動提供的：</p>
        <Bullets
          items={[
            'Email 與密碼（密碼經雜湊處理，我們看不到明文）',
            '顯示名稱、自我介紹、所在縣市與行政區',
            '手機號碼、LINE ID（選填。預設不公開，見第 3 點）',
            '你建立的空閒時段、服務項目與報價',
            '你發布的工作內容、地點、薪資',
            '站內訊息內容、你送出的評價與評分',
          ]}
        />
        <p className="mt-3 font-semibold text-ink">系統自動產生的：</p>
        <Bullets
          items={[
            '帳號建立時間、登入工作階段（session）憑證',
            '邀約、應徵、聯絡方式請求的狀態與時間',
          ]}
        />
        <p className="mt-3">
          本平台
          <span className="font-semibold text-ink">目前沒有使用第三方分析或廣告追蹤工具</span>
          （例如 Google Analytics、Facebook Pixel），也沒有投放廣告用的 Cookie。
          瀏覽器儲存的資料僅有維持登入狀態所需的工作階段憑證。
        </p>
      </Section>

      <Section n="2." title="蒐集目的與利用方式">
        <Bullets
          items={[
            '提供媒合服務：讓需要人手的一方能依時段、分類、地區搜尋到你',
            '維持帳號運作、身分驗證與登入',
            '讓雙方在站內聯絡與留下評價',
            '維護服務安全，處理濫用與爭議',
          ]}
        />
        <p>
          我們
          <span className="font-semibold text-ink">不會將你的個人資料販售、出租或提供給第三方作行銷用途</span>
          。
        </p>
      </Section>

      <Section n="3." title="哪些資料是公開的">
        <p>下列內容任何造訪者（含未登入者）都看得到：</p>
        <Bullets
          items={[
            '顯示名稱、頭像、自我介紹、所在縣市與行政區',
            '你的空閒時段、服務項目與報價',
            '你發布的工作',
            '你收到的評價與平均星等',
          ]}
        />
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-ink">
          <span className="font-bold">手機與 LINE ID 不在其中。</span>
          它們預設不公開，必須在媒合成立後、由對方提出請求、且經你按下「同意分享」，
          才會顯示給該名對象。這個限制是在資料庫層設定的（Row Level Security），
          不是只把畫面藏起來。
        </p>
        <p>
          站內訊息只有對話雙方看得到。評價一旦送出即不可修改或刪除，以維持評價可信度。
        </p>
      </Section>

      <Section n="4." title="資料存放地點與委外">
        <p>
          本平台使用 <span className="font-semibold text-ink">Supabase</span>（資料庫、帳號驗證、
          即時訊息）作為技術服務提供者，資料儲存於其位於
          <span className="font-semibold text-ink">日本東京（AWS ap-northeast-1）</span>的機房。
          這屬於個人資料的國際傳輸，使用本服務即表示你了解並同意此項安排。
        </p>
        <p>
          Supabase 僅依本平台指示處理資料，不會為自身目的使用。網站本身可能由
          Vercel 等平台代管，該類服務會處理連線所需的技術資訊（如 IP 位址）。
        </p>
      </Section>

      <Section n="5." title="保存期間">
        <Bullets
          items={[
            '帳號存續期間持續保存；你刪除帳號後，個人檔案、時段、服務、訊息一併刪除。',
            '已送出的評價在你刪除帳號後仍會保留於對方頁面，但會移除與你的關聯（顯示為已停用使用者），以免有人靠刪號清掉負評。',
            '法令另有要求保存者，依法令規定期間辦理。',
          ]}
        />
      </Section>

      <Section n="6." title="你的權利">
        <p>依《個人資料保護法》第 3 條，你可以就本平台保有的個人資料行使下列權利：</p>
        <Bullets
          items={[
            '查詢、請求閱覽或製給複製本',
            '請求補充或更正（多數欄位可自行在「鴨窩 → 基本資料」修改）',
            '請求停止蒐集、處理或利用',
            '請求刪除',
          ]}
        />
        <p className="mt-2">
          行使方式：來信<a href="mailto:freeduck.tw@gmail.com" className="font-semibold text-brand-600 underline underline-offset-2">freeduck.tw@gmail.com</a>。我們會在合理期間內回覆。
          若你選擇停止利用或刪除資料，可能導致無法繼續使用本服務。
        </p>
      </Section>

      <Section n="7." title="未成年人">
        <p>
          未滿 18 歲者，須經法定代理人同意後始得使用本服務。
          未滿 15 歲者不得使用本服務（《勞動基準法》對童工另有規範）。
        </p>
      </Section>

      <Section n="8." title="資料安全">
        <p>
          本平台以資料庫層級的存取控制（Row Level Security）限制資料可見範圍，
          連線全程使用 HTTPS。惟網路傳輸與儲存無法保證絕對安全，
          請妥善保管你的密碼，並避免在站內訊息中提供金融帳號等高度敏感資訊。
        </p>
      </Section>

      <Section n="9." title="政策修改">
        <p>
          本政策如有修改，將於本頁公告並更新「最後更新」日期。
          涉及重大變更時，會在你下次登入時另行提示。
        </p>
        <p>
          若變更涉及
          <span className="font-semibold text-ink">新的蒐集目的</span>
          （例如將資料用於原本未告知的用途），我們會依《個人資料保護法》
          重新向你告知並取得同意，不會以「繼續使用即視為同意」帶過。
        </p>
      </Section>

      <Section n="10." title="未來若引入廣告或收費">
        <p>
          本平台目前
          <span className="font-semibold text-ink">沒有任何廣告，也沒有向使用者收費</span>。
          我們知道日後可能需要營收來維持營運，因此先把界線寫清楚：
        </p>
        <Bullets
          items={[
            <>
              <span className="font-semibold text-ink">不會把你的個人資料販售或提供給廣告商。</span>
              這一條不因營運模式改變而改變。
            </>,
            <>
              若引入廣告，會先在本頁與站內公告，說明是自售版位、還是第三方聯播網
              （後者可能使用 Cookie 進行跨站追蹤）。
            </>,
            <>
              若採用會追蹤行為的廣告技術，將另行提供
              <span className="font-semibold text-ink">明確的同意選項</span>
              ，你可以拒絕而不影響媒合功能的使用。
            </>,
            <>
              若未來收取費用（例如訂閱、刊登費），會在收費前明確標示，
              並於使用條款揭露；既有的免費功能不會在未通知的情況下轉為付費。
            </>,
          ]}
        />
      </Section>
    </LegalPage>
  );
}
