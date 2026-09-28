import fs from 'fs';
import path from 'path';

const file = '/workspaces/Jacxi_Shipping/src/app/dashboard/settings/call-agent/page.tsx';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('export default function CallAgentSettingsPage() {')) {
  process.exit(1);
}

// 1. Add hook inside the component
const hookCode = `
  const [testingCall, setTestingCall] = useState(false);

  const handleTestCall = async () => {
    if (!config?.twilioInspection.phoneNumber) {
      toast.error('No Twilio phone number available');
      return;
    }
    
    // We'll prompt the user for the number using a simple window.prompt
    const toField = window.prompt('Enter your phone number to test (e.g. +1...):');
    if (!toField) return;

    setTestingCall(true);
    try {
      const response = await fetch('/api/voice/test-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toField }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Failed to start test call');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setTestingCall(false);
    }
  };
`;

source = source.replace(/const handleRefresh = async \(\) => \{/, hookCode + '\n  const handleRefresh = async () => {');

// 2. Add the button
const buttonCode = `
            <Button
              variant="outline"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={() => void handleTestCall()}
              disabled={!config?.status.twilioPhoneNumberConfigured && !config?.status.twilioPhoneNumberSidConfigured}
              loading={testingCall}
            >
              Test Call
            </Button>`;

source = source.replace('Refresh Twilio Inspection\n            </Button>', 'Refresh Twilio Inspection\n            </Button>\n' + buttonCode);

// Add the other one for the top header
source = source.replace('Refresh Twilio Inspection\n              </Button>', 'Refresh Twilio Inspection\n              </Button>\n' + buttonCode.replace('            <Button', '              <Button'));

fs.writeFileSync(file, source);
console.log('Done');
