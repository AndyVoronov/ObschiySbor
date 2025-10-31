#!/bin/bash

FILE="frontend/src/components/GameCard.jsx"

# 1. Change constructor to accept callbacks
sed -i 's/constructor() {/constructor(callbacks) {/' "$FILE"
sed -i '184 a\        this.callbacks = callbacks || {};' "$FILE"

# 2. Add action handlers to addEventListeners
sed -i '/const abilityType = tab.getAttribute/a\
\
            \/\/ Если клик по slam - вызываем onEdit\
            if (abilityType === '\''slam'\'' \&\& this.callbacks.onEdit) {\
              console.log('\''Slam tab clicked, calling onEdit()'\'');\
              this.callbacks.onEdit();\
              return;\
            }\
\
            \/\/ Если клик по meteor - вызываем onLogout\
            if (abilityType === '\''meteor'\'' \&\& this.callbacks.onLogout) {\
              console.log('\''Meteor tab clicked, calling onLogout()'\'');\
              this.callbacks.onLogout();\
              return;\
            }' "$FILE"

# 3. Change AbilitySelector initialization to pass callbacks
sed -i 's/new AbilitySelector();/new AbilitySelector({\
        onEdit: onEdit,\
        onLogout: handleLogoutClick\
      });/' "$FILE"

echo "GameCard.jsx has been updated"
