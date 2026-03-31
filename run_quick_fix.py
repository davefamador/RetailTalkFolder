import re

fp = r"C:\Moi\Thesis\Code\RetailTalkFolder\RetailTalk\frontend\src\app\admin\dashboard\Dashboardpage.js"

with open(fp, "r", encoding="utf-8") as f:
    text = f.read()

# Fix peso signs
text = text.replace("â‚±", "PHP ")

# Fix the Create Store icon (which has broken emoji like ðŸ\u008fª)
# We can just replace the whole button content if needed, but let's just do regex or simple replace
text = text.replace("ðŸ\u008fª", "<Store size={14} />")
text = text.replace("ðŸ'¼", "<Users size={14} />")
text = text.replace("ðŸ\u0093¥", "<Inbox size={14} />")
text = text.replace("ðŸ\u0093¦", "<Package size={14} />")
text = text.replace("ðŸšš", "<Truck size={14} />")
text = text.replace("ðŸ§¾", "<Receipt size={14} />")

text = text.replace("â\u009a\u00a0ï¸\u008f", "<AlertCircle size={14} />")
text = text.replace("âœ“", "Yes")
text = text.replace("âœ•", "No")
text = text.replace("â›”", "Ban")

with open(fp, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(text)

print("Direct UI fixes applied.")
