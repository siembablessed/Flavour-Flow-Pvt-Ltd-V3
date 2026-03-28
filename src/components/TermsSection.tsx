import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TermsBlock = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const sections: TermsBlock[] = [
  {
    title: "Introduction",
    paragraphs: [
      "These terms govern your use of https://flavourflows.com/ The site and your purchase of products from the different Stores on the Site. By accepting these terms and conditions (including the linked information herein), and by using the Site, you represent that you agree to comply with these terms and conditions with Flavour Flow Private Limited in relation to your use of the Site Terms and Conditions.",
      "This Terms and Conditions is effective upon acceptance. Before you may become or continue as a member of the Site, you must read, agree with and accept this Terms and Conditions.",
      "You should read this Terms and Conditions and the Privacy Policy and access and read all further linked information referred to in this Terms and Conditions, as such information contains further terms and conditions that apply to you as a user of the site. Such linked information including but not limited to Terms and Conditions on individual Store pages is hereby incorporated by reference into this Terms and Conditions.",
    ],
  },
  {
    title: "Currency",
    paragraphs: [
      "All prices are quoted in US Dollar ($) and all transactions will be charged in US$. The actual amount to be paid in your home currency will be determined by the prevailing exchange rate of our bankers.",
    ],
  },
  {
    title: "Ordering",
    paragraphs: [
      "When buying an item, you agree that:",
      "Please note that:",
      "In connection with using or accessing the Services you will not:",
      "If we believe or discover that you are abusing Flavour Flow Private Limited in any of the ways mentioned above or otherwise, we may, in our sole discretion, take any steps to prevent and mitigate such abuse such as limiting, suspending, or terminating your user account(s) and access to our Services, delaying or removing hosted content, removing any special status associated with your account(s), reducing or eliminating any discounts, and taking technical and/or legal steps to prevent you from using our Services.",
      "We may cancel unconfirmed accounts or accounts that have been inactive for a long time or modify or discontinue our Services. Additionally, we reserve the right to refuse or terminate our Services to anyone for any reason at our discretion.",
    ],
    bullets: [
      "You are responsible for reading the full item listing before making a commitment to buy.",
      "You have read and agreed to be bound by the particular terms and conditions of sale applying to that item.",
      "You enter into a legally binding contract to purchase an item when you commit to buy an item.",
      "You are contracting with the respective Stores from which you are buying.",
      "We do not transfer legal ownership of items from the seller to the buyer.",
      "If you are buying on behalf of a company, you are confirming that you are authorised to transact on behalf of the company.",
      "Placing goods in one Cart does not constitute an order.",
      "An order is confirmed when one checks out and receives a proforma.",
      "Goods can only be held in one Cart for 1 hour after check out. Goods not paid within one hour of checking out will automatically return to the store and will be available to other shoppers.",
      "use our Services if you are not able to form legally binding contracts (for example if you are under 18), or are temporarily or indefinitely suspended from using our sites, services, applications or tools;",
      "fail to pay for items purchased by you, unless you have a valid reason as set out in respective online stores policy, for example, the seller has materially changed the item description after you bid, a clear typographical error is made, or you cannot contact the seller;",
      "post false, inaccurate, misleading, defamatory, or libellous content;",
      "transfer your Flavour Flow Private Limited account (including Feedback) and user ID to another party without our consent;",
      "distribute or post spam, unsolicited or bulk electronic communications, chain letters, or pyramid schemes;",
      "distribute viruses or any other technologies that may harm Liquor Deliveries, or the interests or property of users;",
      "commercialize any Flavour Flow Private Limited application or any information or software associated with such application;",
      "harvest or otherwise collect information about users without their consent; or",
      "circumvent any technical measures we use to provide the Services.",
    ],
  },
  {
    title: "Your Account and Registration Obligation",
    paragraphs: [
      "When you register as a member of the Site you have been or will be required to provide certain information and register a username and password for use on this Site. On becoming a member of the Site, you agree:",
    ],
    bullets: [
      "That you are responsible for maintaining the confidentiality of, and restricting access to and use of, your account and password, and accept responsibility for all activities that occur under your account and password.",
      "To immediately notify Flavour Flow Private Limited of any unauthorized use of your password or account or any other breach of security. In no event will Flavour Flow Private Limited be liable for any direct, indirect or consequential loss or loss of profits, goodwill or damage whatsoever resulting from the disclosure of your username and/or password. You may not use another personal account at any time, without the express permission of the account holder.",
      "To Flavour Flow Private Limited for any improper, unauthorized or illegal use of your account by you or by any person obtaining access to the Site, services or otherwise by using your designated username and password, whether or not you authorized such access.",
      "You will provide true, accurate, current and complete information about yourself as prompted by Flavour Flow Private Limited registration form. Flavour Flow Private Limited may (in its sole discretion and at any time), make any inquiries it considers necessary (whether directly or through a third party), and request that you provide it with further information or documentation, including without limitation to verify your identity and/or proof of residents.",
    ],
  },
  {
    title: "Electronic Communications",
    paragraphs: [
      "You agree to receive calls, including autodialed and/or pre-recorded message calls, from Flavour Flow Private Limited at any of the telephone numbers (including mobile telephone numbers) that we have collected, including telephone numbers you have provided us, or that we have obtained from third parties or collected by our own efforts. If the telephone number that we have collected is a mobile telephone number, you consent to receive SMS or other text messages at that number.",
      "Standard telephone minute and text charges may apply if we contact you at a mobile number or device. You agree we may contact you in the manner described above at the telephone numbers we have in our records for these purposes:",
      "Flavour Flow Private Limited may share your telephone numbers with our service providers (such as billing or collections companies) who we have contracted with to assist us in pursuing our rights or performing our obligations under the Terms and Conditions, our policies, or any other agreement we may have with you. These service providers may also contact you using autodialed or pre-recorded messages calls and/or SMS or other text messages, only as authorized by us to carry out the purposes we have identified above, and not for their own purposes.",
    ],
    bullets: [
      "To contact you for reasons relating to your account or your use of our Services (such as to resolve a dispute, or to otherwise enforce our Terms and Conditions) or as authorized by applicable law.",
      "To contact you for marketing, promotional, or other reasons that you have either previously consented to or that you may be asked to consent to in the future.",
    ],
  },
  {
    title: "Fees and Services",
    paragraphs: [
      "The Site is an online platform allowing for the sale and purchase of items between sellers and buyers. Membership on the Site is free. Flavour Flow Private Limited does not charge any fee for browsing the Site.",
    ],
  },
  {
    title: "Payments",
    paragraphs: [
      "Flavour Flow Private Limited Payments system means that payment for items on the Site may be made online or partly online through the Flavour Flow Private Limited payment facilities which Flavour Flow Private Limited makes available on the Site.",
      "By providing these payment facilities, Flavour Flow Private Limited is merely facilitating the making of online payments by buyers possible but Flavour Flow Private Limited is not involved in the process of buying and selling items on the Site. All sales and purchases on the Site continue to be bipartite contracts between the buyer and the seller of an item(s) and Flavour Flow Private Limited is not responsible for any non-performance, breach or any other claim relating to or arising out of any contract entered into between any buyers and sellers, nor does Flavour Flow Private Limited have any fiduciary duty to any user.",
    ],
  },
  {
    title: "Pricing Policy",
    paragraphs: [
      "All prices are inclusive of VAT (where applicable) at the current rate and are correct at the time of entering the information onto the system. We reserve the right to amend prices without notice from time to time. The total cost of your order is the price of the products ordered plus delivery charges, where applicable.",
      "By completing the process for an on-line order you are confirming that the credit/debit card and Ecocash/Telecash account being used for the transaction(s) are yours.",
      "Although we try to ensure all our prices displayed on our website are accurate, errors may sometimes occur. If we discover an error in the price of an item you have ordered we will contact you as soon as possible. You will have the option to reconfirm your order at the correct price or cancel it.",
    ],
  },
  {
    title: "Delivery",
    paragraphs: [
      "Delivery service is available on selected products. On these products, you may opt to have the purchased item/s delivered to your preferred address or you may opt to collect the purchased item/s from the supplier. If you opt for delivery, you will be notified of the delivery cost at checkout point. You are required to make payment for the delivery service before goods are delivered.",
      "We will make every effort to facilitate the delivery of goods within the estimated timelines. However delays are occasionally inevitable due to unforeseen factors or events outside our control, for example extreme weather, a flood or fire. Flavour Flow Private Limited is merely facilitating the process and shall be under no liability for any delay or failure to deliver the products within estimated timelines. Risk of loss and damage of products passes to you on the date when the products are delivered to you.",
      "The following delivery options are available.",
    ],
    bullets: [
      "Normal Delivery Service: Goods will be delivered within 48hours of purchase.",
      "After Hours Delivery Service: Flavour Flow Private Limited offers flexible delivery times for buyers who may not be available during normal business hours and choose to have their orders delivered late into the night. This service is available between 1700hrs to 2200hours Monday to Saturday.",
      "International Deliveries: International Deliveries will require a separate arrangement from the above options. Please contact Flavour Flow Private Limited team for arrangements.",
    ],
  },
  {
    title: "Returns Policy",
    paragraphs: [
      "Please note that not all products are returnable and not all shops will accept returns. Each shop has a returns policy available on their site and you must understand each Store returns policy.",
      "To claim refund or exchange any item you are not completely happy with, contact us though our customer service email or our available phone lines elaborating the product name, receipt number, and reason of return within 48hours of the item being delivered to your nominated address or collected. Flavour Flow Private Limited will forward the request to the shop the product was purchased.",
      "If a return agreement is reached please return items in their original condition, unused, in their original packaging, with garment tags and any other security devices still attached within 14 days. Flavour Flow Private Limited, its officers, employees, agents, and affiliates shall not be liable if the store from which you purchased a product fails to return any goods as we are only facilitating the process.",
      "The following products cannot be returned once purchased:",
    ],
    bullets: [
      "Any products personalised to customers specifications;",
      "Newspapers and magazines;",
      "Goods sold by way of auction; and",
      "Hampers, food, beverages and perishable goods(including flowers)",
    ],
  },
  {
    title: "Platform for Communication",
    paragraphs: [
      "The Site is a platform for communication whereby users may meet and interact with one another for the purpose of the sale and purchase of items. Flavour Flow Private Limited does not buy or sell items.",
      "The Site cannot guarantee that a buyer or seller will complete a transaction or accept the return of an item or provide any refund for the same. Flavour Flow Private Limited is not responsible for any non-performance or breach of any contract entered into between users and does not transfer legal ownership of items from the seller to the buyer.",
      "The contract for sale of any item shall be a strictly bipartite contract between the seller and the buyer. At no time shall any right, title or interest over any item vest with Flavour Flow Private Limited nor shall Liquor Deliveries have any obligations or liabilities in respect of such item or the contract between the buyer and seller.",
      "Flavour Flow Private Limited is not responsible for unsatisfactory or delayed performance, losses, damages or delays as a result of items which are unavailable. Flavour Flow Private Limited is not required to mediate or resolve any dispute or disagreement between users.",
      "The Site has no control over and does not guarantee the quality, safety or legality of items advertised, the truth or accuracy of users content or listings, the ability of sellers to sell items, or the ability of buyers to pay for items. Flavour Flow Private Limited does not make any representation or warranty as to the attributes (including but not limited to quality, worth or marketability) of the items proposed to be sold or purchased on the Site.",
      "In particular, Flavour Flow Private Limited does not implicitly or explicitly support or endorse the sale or purchase of any items on the Site, nor is Flavour Flow Private Limited a supplier or manufacturer of any items sold by Stores or purchased by users. The Site does not make any representation or warranty as to the attributes (including but not limited to legal title, creditworthiness, or identity) of any of its users.",
    ],
  },
  {
    title: "Links to Third Party Websites",
    paragraphs: [
      "The Site may include links to third party websites that are controlled by and maintained by others. The Site cannot accept any responsibility for the materials or offers for goods or services featured on such websites and any link to such websites is not an endorsement of such websites or a warranty that such websites will be free of viruses or other such items of a destructive nature and you acknowledge and agree that Flavour Flow Private Limited is not responsible for the content or availability of any such sites.",
    ],
  },
  {
    title: "Limitation of Liabilities",
    paragraphs: [
      "To the extent permitted by law, Flavour Flow Private Limited, its officers, employees, agents, affiliates and suppliers shall not be liable for any loss or damage whatsoever whether direct, indirect, incidental, special, consequential or exemplary, including but not limited to, losses or damages for loss of profits, goodwill, business, opportunity, data or other intangible losses arising out of or in connection with your use of the Site, its services or this Terms and Conditions (however arising, including negligence or otherwise and whether or not Flavour Flow Private Limited has been advised of the possibility of such losses or damages).",
      "If you are dissatisfied with the Site or any content or materials on it, your sole exclusive remedy is to discontinue your use of it. Further, you agree that any unauthorised use of the Site and its services as a result of your negligent act or omission would result in irreparable injury to Flavour Flow Private Limited shall treat any such unauthorised use as subject to the terms and conditions of this Terms and Conditions.",
    ],
  },
  {
    title: "Indemnity",
    paragraphs: [
      "You agree to indemnify and hold Flavour Flow Private Limited and its affiliates, officers, employees, agents and suppliers harmless from any and all claims, demands, actions, proceedings, losses, liabilities, damages, costs, expenses (including reasonable legal costs and expenses), howsoever suffered or incurred due to or arising out of your breach of this Terms and Conditions, or your violation of any law or the rights of a third party.",
    ],
  },
  {
    title: "Warranties and Disclaimers",
    paragraphs: [
      "You acknowledge that due to the nature of the Internet, we cannot guarantee that access to the Website will be uninterrupted or that e-mails or other electronic transmissions will be send to you or received by us. You expressly agree that use of this service is at your sole risk.",
      "To the fullest extent permissible under the applicable law, Flavour Flow Private Limited and its affiliates disclaim all warranties of any kind, express or implied, including but not limited to, warranties of title, or implied warranties of merchantability or fitness for a particular purpose.",
      "We try to keep Flavour Flow Private Limited and its Services safe, secure, and functioning properly, but we cannot guarantee the continuous operation of or access to our Services. Site updates and other notification functionality in Flavour Flow Private Limited Services may not occur in real time. Such functionality is subject to delays beyond Flavour Flow Private Limited control.",
      "Any Warranty or Guarantee on products is offered by the respective Stores and not Flavour Flow Private Limited. Please refer each store Warranty and Guarantee Policy.",
    ],
    bullets: [
      "That the service, including its content, will meet your requirements or be accurate, complete, reliable, or error free;",
      "That the service will always be available or will be uninterrupted, accessible, timely, or secure;",
      "That any defects will be corrected, or that the service will be free from viruses, or other harmful properties;",
      "The accuracy, reliability, timeliness, or completeness of any review, recommendation, or other material published or accessible on or through the service or the site;",
      "The availability for sale, or the reliability or quality of any products.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "You are solely responsible for keeping your personal username and password secure and confidential. You should not disclose your username or password to any other party. Once logged on using your username and password whether authorised or unauthorised, you take full responsibility for the ensuing transactions once access to the site is obtained. If you believe that your username and/or password have been compromised or you are aware of any other breach of security regarding the Site, then you must notify us immediately.",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "Save for any trademarks of the Stores featured on the Website, all contents of this Website including, but not limited to, the text, graphics, links and sounds are owned by Flavour Flow Private Limited and may not be copied, downloaded, distributed or published in any way without their prior written consent, except that you may print, copy, download or temporarily store extracts for your personal information or when you use the Services.",
    ],
  },
  {
    title: "Applicable Law",
    paragraphs: [
      "Any dispute arising out of your use of this Website or material or content from this Website shall be resolved according to the laws of Zimbabwe. Zimbabwean Courts shall have exclusive jurisdiction over all claims against Flavour Flow Private Limited.",
    ],
  },
  {
    title: "Amendments",
    paragraphs: [
      "HT may amend this Terms and Conditions at any time, and the amendments will be posted on the site. Changes take effect when they are posted on the site. Your continued use of this site after the changes have been posted means that you are in agreement with the changes.",
    ],
  },
];

interface TermsSectionProps {
  triggerClassName?: string;
}

const TermsSection = ({ triggerClassName }: TermsSectionProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <button type="button" className={triggerClassName}>
        Terms and Conditions
      </button>
    </DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-4xl overflow-hidden p-0">
      <div className="border-b border-border px-6 py-5">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Phone: <a href="tel:00263771420031" className="font-medium text-primary">00263 7714 20031</a>
          </DialogDescription>
        </DialogHeader>
      </div>

      <div className="max-h-[calc(85vh-88px)] space-y-5 overflow-y-auto px-6 py-5">
        <p className="text-sm leading-7 text-foreground/70">
          These terms apply to your use of <a href="https://flavourflows.com/" className="text-primary underline-offset-4 hover:underline">flavourflows.com</a> and to purchases made through the platform.
        </p>

        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-7 text-foreground/75">
                {paragraph}
              </p>
            ))}

            {section.bullets && (
              <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground/75">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <p className="text-xs text-foreground/45">© Copyright 2026 Flavour Flow Private Limited. All Rights Reserved</p>
      </div>
    </DialogContent>
  </Dialog>
);

export default TermsSection;
