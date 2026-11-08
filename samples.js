// Fictional sample documents (no real patient data). Formats follow common U.S. after-visit-summary layouts.
// Several contain deliberate, realistic errors so the safety checks can be demonstrated.
window.PLAINLY_SAMPLES = {
  discharge: {
    label: "Heart failure discharge",
    text: `DISCHARGE SUMMARY - Riverside General Hospital
Patient: Jane Example   DOB: 03/14/1957   MRN: 00482913
Admit date: 10/28/2026   Discharge date: 11/02/2026
Attending: Dr. A. Rivera, Cardiology
Allergies: Sulfa drugs (rash)

Diagnosis: Acute decompensated heart failure with reduced ejection fraction (HFrEF), EF 30%. Hypertension. CKD stage 3a.

Hospital course: Pt is a 69 y/o F who presented with progressive dyspnea on exertion, orthopnea and bilateral LE edema. Treated with IV diuresis with good response. Net negative 4.2 L. Echo showed LVEF 30%. Transitioned to PO furosemide prior to discharge.

START taking these medications:
- Furosemide 40 mg PO BID
- Spironolactone 25 mg PO daily
- Potassium chloride 20 mEq PO daily

CHANGE how you take these medications:
- Metoprolol succinate 50 mg PO daily (was 25 mg)

CONTINUE taking these medications:
- Lisinopril 10 mg PO daily
- Naproxen 220 mg PO BID PRN joint pain
- Acetaminophen 500 mg 2 tabs PO q6h PRN pain

STOP taking these medications:
- Hydrochlorothiazide 25 mg daily

Instructions:
Weigh yourself every morning before breakfast and write it down.
Low sodium diet, less than 2 g sodium per day. Fluid restriction 2 L/day.
Activity as tolerated. No heavy lifting over 10 lb for 2 weeks.
Avoid NSAIDs such as ibuprofen and naproxen.

Call your doctor if you have any of the following:
- Weight gain of more than 2 lb in one day or 5 lb in one week
- Worsening leg swelling
- Dizziness or lightheadedness
- You cannot lie flat to sleep

Call 911 if you have:
- Chest pain
- Severe shortness of breath
- Fainting

Follow-up:
Cardiology clinic with Dr. Rivera on 11/09/2026 at 10:30 AM.
Labs: BMP in 1 week to check potassium and creatinine.
Follow up with your PCP in 2 weeks.

Pending results: Thyroid function test (TSH) is pending. We will call you with the result.`,
  },
  surgery: {
    label: "After surgery (gallbladder)",
    text: `AFTER VISIT SUMMARY - Lakeside Surgical Center
Patient: John Sample   DOB: 07/22/1971
Date of visit: 11/04/2026
Procedure: Laparoscopic cholecystectomy
Allergies: Penicillin (hives)

Your medications:
- Oxycodone-acetaminophen (Percocet) 5-325 mg 1-2 tabs PO q4h PRN severe pain
- Acetaminophen 1000 mg PO q6h PRN mild pain
- Cephalexin 500 mg PO QID x 5 days
- Lorazepam 0.5 mg PO QHS PRN sleep
- Docusate 100 mg PO BID while taking oxycodone

Wound care:
- You may shower after 48 hours. Pat the incisions dry.
- Do not soak in a bath or swim for 2 weeks.
- Leave the steri-strips in place; they will fall off on their own.

Activity:
- Walk several times a day.
- No lifting over 15 lb for 4 weeks. No driving while taking oxycodone.

Call 911 or go to the emergency room if:
- You have trouble breathing or chest pain
- You vomit blood

Call your surgeon if:
- Fever over 101 F
- Redness, warmth or pus at the incision
- Yellowing of the skin or eyes
- Severe belly pain that is not relieved by medicine

Follow-up: Post-op visit with Dr. Chen in 2 weeks. Call 555-0143 to schedule.
Pathology results are pending; we will call you.`,
  },
  labs: {
    label: "Lab results",
    text: `LABORATORY REPORT - Northside Clinic Lab
Patient: Maria Sample   Collected: 11/03/2026 08:12   Ordering provider: Dr. K. Osei

COMPREHENSIVE METABOLIC PANEL
Glucose, fasting  148 mg/dL  (70-99)  H
Sodium  139 mmol/L  (135-145)
Potassium  5.4 mmol/L  (3.5-5.1)  H
Creatinine  1.3 mg/dL  (0.7-1.3)
eGFR  58 mL/min/1.73m2  (>60)  L
ALT  32 U/L  (7-56)

HEMOGLOBIN A1C
Hemoglobin A1c  8.1 %  (4.0-5.6)  H

LIPID PANEL
Total cholesterol  224 mg/dL  (<200)  H
LDL cholesterol  151 mg/dL  (<100)  H
HDL cholesterol  38 mg/dL  (>40)  L
Triglycerides  176 mg/dL  (<150)  H

COMPLETE BLOOD COUNT
Hemoglobin  13.9 g/dL  (13.5-17.5)
WBC  7.2 K/uL  (4.5-11.0)
Platelets  250 K/uL  (150-400)

Comment: Results consistent with poorly controlled type 2 diabetes mellitus and dyslipidemia. Mild hyperkalemia - repeat BMP in 1 week. Discuss statin therapy at follow-up visit.`,
  },
  prescription: {
    label: "Urgent care prescription",
    text: `AFTER VISIT SUMMARY - Lakeview Urgent Care   11/05/2026
Diagnosis: Acute otitis media, left ear. Fever.

Rx: Amoxicillin 875 mg PO BID x10d. Take with food. Finish all medication even if symptoms improve.
Ibuprofen 400 mg PO q6h PRN pain or fever. Take with food. Max 4 doses in 24 hrs.

Avoid getting water in the ear. Rest and push fluids.
Recheck in 10-14 days if symptoms persist.
Seek immediate medical care if you have a stiff neck, severe headache, swelling behind the ear, or high fever over 104 F.
Call the clinic if no improvement after 48-72 hours or if you develop a rash or diarrhea.`,
  },
  // Medication reconciliation demo: what the hospital sent home vs. what the patient takes
  reconcileA: {
    label: "Hospital discharge list",
    text: `Discharge medication list
Furosemide 40 mg PO BID
Metoprolol succinate 50 mg PO daily
Lisinopril 10 mg PO daily
Apixaban 5 mg PO BID
Atorvastatin 40 mg PO QHS`,
  },
  reconcileB: {
    label: "Pill bottles at home",
    text: `Lasix 20 mg take 1 tablet every morning
Toprol XL 25 mg 1 tab daily
Lisinopril 10 mg 1 tab daily
Warfarin 5 mg 1 tab daily
Aspirin 81 mg daily
Lipitor 40 mg at bedtime`,
  },
  // Clinician "before you hand it out" demo
  clinician: {
    label: "Draft discharge note",
    text: `Dx: CAP, COPD exac. s/p 3d IV abx, afebrile x 48h, SpO2 94% RA.
D/C home. Levofloxacin 750 mg PO QD x 4d. Prednisone 40 mg PO QD x 3d then D/C.
Albuterol HFA 2 puffs INH q4h PRN SOB. Insulin glargine 10U SC QHS while on steroids.
Morphine MSO4 2 mg PO q4h PRN.
Pt to f/u w/ PCP. Return precautions given.`,
  },
};
