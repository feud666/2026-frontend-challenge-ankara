from dotenv import load_dotenv
from jotform import JotformAPIClient
import os

load_dotenv()
API_KEY = os.environ["JOTFORM_API_KEY"]
client = JotformAPIClient(API_KEY)

# 1. List all forms on the account
forms = client.get_forms()
print(f"Found {len(forms)} forms:\n")
for f in forms:
    print(f"  - {f['title']}  (id: {f['id']}, count: {f['count']})")

print("\n" + "="*60 + "\n")

# 2. For each form, peek at the first submission to see the shape
for f in forms:
    form_id = f['id']
    print(f"\n### {f['title']} ({form_id})")
    
    # Get the questions (field definitions) — useful for understanding structure
    questions = client.get_form_questions(form_id)
    print(" Questions:")
    for qid, q in questions.items():
        print(f"   [{qid}] {q.get('text', '?')}  type={q.get('type')}")
    
    # Get a few submissions to see real data
    subs = client.get_form_submissions(form_id, limit=2)
    print(f" Sample submissions ({len(subs)} shown):")
    for s in subs:
        print(f"   submission_id={s['id']}  created={s['created_at']}")
        for qid, ans in s['answers'].items():
            print(f"     [{qid}] {ans.get('text','?')}: {ans.get('answer')}")