// CardService UI builders (Ref: design/components.md C1, api-spec.md C)

type Card = GoogleAppsScript.Card_Service.Card;
type ActionResponse = GoogleAppsScript.Card_Service.ActionResponse;
type SelectionInput = GoogleAppsScript.Card_Service.SelectionInput;

function langInput(): SelectionInput {
  return CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('ภาษา')
    .setFieldName('lang')
    .addItem('ไทย', 'th', true)
    .addItem('English', 'en', false);
}

function toneInput(): SelectionInput {
  return CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle('โทน')
    .setFieldName('tone')
    .addItem('เป็นทางการ', 'formal', false)
    .addItem('กระชับ', 'concise', false)
    .addItem('เป็นมิตร', 'friendly', true);
}

export function homepageCard(): Card {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('AI Workspace Assistant'))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          'ผู้ช่วย AI สำหรับสรุปและร่างข้อความ — เปิดอีเมลใน Gmail หรือเอกสารใน Docs แล้วกดปุ่มเพื่อเริ่มใช้งาน',
        ),
      ),
    )
    .build();
}

export function contextualCard(context: 'gmail' | 'docs'): Card {
  const section = CardService.newCardSection().addWidget(langInput());

  section.addWidget(
    CardService.newTextButton()
      .setText('สรุปเนื้อหา')
      .setOnClickAction(CardService.newAction().setFunctionName('onSummarize')),
  );

  if (context === 'gmail') {
    section.addWidget(toneInput());
    section.addWidget(
      CardService.newTextButton()
        .setText('ร่างข้อความตอบกลับ')
        .setOnClickAction(CardService.newAction().setFunctionName('onDraft')),
    );
    // ปุ่มสรุป 5 อีเมลล่าสุดจาก inbox
    section.addWidget(CardService.newDivider());
    section.addWidget(
      CardService.newTextButton()
        .setText('สรุป 5 อีเมลล่าสุด (Inbox)')
        .setOnClickAction(CardService.newAction().setFunctionName('onSummarizeInbox')),
    );
  }

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('AI Assistant'))
    .addSection(section)
    .build();
}

export function resultCard(title: string, text: string): Card {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(title))
    .addSection(
      CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(text)),
    )
    .build();
}

export function pushCard(card: Card): ActionResponse {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

// การ์ดเตือนเมื่อพบข้อมูลต้องห้าม (HITL) — ไม่ใช้อิโมจิ (design-system policy)
export function confirmCard(token: string, kind: string): Card {
  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph().setText(
        '[แจ้งเตือน] พบข้อความที่อาจเป็นข้อมูลความลับหรือข้อมูลส่วนบุคคล กรุณาตรวจสอบก่อนส่งให้ AI',
      ),
    )
    .addWidget(
      CardService.newTextButton()
        .setText('ยืนยันและดำเนินการต่อ')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onConfirmSensitive')
            .setParameters({ token, kind }),
        ),
    );
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('ต้องการการยืนยัน'))
    .addSection(section)
    .build();
}

export function notify(message: string): ActionResponse {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(message))
    .build();
}
