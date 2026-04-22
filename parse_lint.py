import json

try:
    with open('lint-results.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for report in data:
        if report['errorCount'] > 0:
            print(f"{report['filePath']}: {report['errorCount']} errors, {report['warningCount']} warnings")
            for msg in report['messages']:
                if msg['severity'] == 2: # Error
                    print(f"  Line {msg['line']}:{msg['column']} - {msg['ruleId']}: {msg['message']}")
except Exception as e:
    print(f"Error: {e}")
