// PermissionToggles — admin controls for room permissions

import type { RoomPermissions } from '../types';

interface PermissionTogglesProps {
  permissions: RoomPermissions;
  onChange: (perms: Partial<RoomPermissions>) => void;
}

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-[#151b2d] rounded-lg border border-white/5 transition-all hover:bg-[#191f31]">
      <span className="text-sm text-[#dce1fb]">{label}</span>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`toggle-track ${checked ? 'checked' : ''}`}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  );
}

export default function PermissionToggles({ permissions, onChange }: PermissionTogglesProps) {
  return (
    <div className="space-y-3">
      <Toggle
        id="toggle-progress"
        label="Allow Progress Bar Control"
        checked={permissions.allowProgressControl}
        onChange={v => onChange({ allowProgressControl: v })}
      />
      <Toggle
        id="toggle-chat"
        label="Allow Chatting"
        checked={permissions.allowChat}
        onChange={v => onChange({ allowChat: v })}
      />
      <Toggle
        id="toggle-mic"
        label="Allow Mic"
        checked={permissions.allowMic}
        onChange={v => onChange({ allowMic: v })}
      />
    </div>
  );
}
