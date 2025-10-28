// Компонент красивого круглого чекбокса
import './RoundCheckbox.css';

const RoundCheckbox = ({ id, name, checked, onChange, label, disabled }) => {
  return (
    <div className="round-checkbox-container">
      <div className="round">
        <input
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <label htmlFor={id}></label>
      </div>
      {label && <span className="round-checkbox-label">{label}</span>}
    </div>
  );
};

export default RoundCheckbox;
