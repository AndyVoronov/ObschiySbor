import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './EventTabs.css';

const EventTabs = ({ children, tabs }) => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="event-tabs-container">
      <div className="tabs">
        <div className="tab__indicator">
          <div className="indicator">
            <div className="indicator__part indicator__part--left"></div>
            <div className="indicator__part indicator__part--right"></div>
          </div>
        </div>
        <ul>
          {tabs.map((tab, index) => (
            <li key={index}>
              <label htmlFor={`tab-${index}`}>{tab.label}</label>
              <input
                className="sr-only"
                type="radio"
                name="event-tabs"
                id={`tab-${index}`}
                checked={activeTab === index}
                onChange={() => setActiveTab(index)}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="tab-content">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

export default EventTabs;
