import "./Header.css";

type Props = {
  exit?: () => void;
  setSound: (sound: boolean) => void;
  toggleVoice: () => void;
  sound: boolean;
  voice: boolean;
};

export function Header({ exit, setSound, toggleVoice, sound, voice }: Props) {
  return (
    <div className="game-header">
      <a className="edit" href="#" onClick={() => exit?.()}>
        ✎
      </a>
      <div className="game-settings">
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
      </div>
    </div>
  );
}
