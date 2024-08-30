import "./Header.css";

type Props = {
  exit?: () => void;
  setSound: (sound: boolean) => void;
  toggleVoice: () => void;
  sound: boolean;
  voice: boolean;
};

const SHOW_VOICE = false;
const SHOW_SOUND = false;

export function Header({ exit, setSound, toggleVoice, sound, voice }: Props) {
  return (
    <div className="game-header">
      <a className="edit" href="#" onClick={() => exit?.()}>
        ✎
      </a>
      <div className="game-settings">
        {SHOW_SOUND && (
          <div>
            👂
            <input
              type="checkbox"
              id="sound"
              name="sound"
              checked={sound}
              onChange={() => setSound(!sound)}
            />
          </div>
        )}
        {SHOW_VOICE && (
          <div>
            👄
            <input
              type="checkbox"
              id="voice"
              name="voice"
              checked={voice}
              onChange={() => toggleVoice()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
