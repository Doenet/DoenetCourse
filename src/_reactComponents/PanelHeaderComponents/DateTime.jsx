import React, { useState } from 'react';

import { DateInput } from '@blueprintjs/datetime';

import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import './dateTime.css';

//Passes up the selected date through a onDateChange(selectedDate: Date) prop

export default function DateTime(props) {
  const [dateState, setDateState] = useState(new Date(Date.now()));

  const timeProps = {
    showArrowButtons: true,
    useAmPm: true,
  };

  const renderDate = (date) => {
    const dayMonthYear =
      date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();
    const hours = date.getHours() % 12 === 0 ? 12 : date.getHours() % 12;
    const minutes =
      date.getMinutes() < 10
        ? '0' + date.getMinutes()
        : date.getMinutes().toString();
    const time = hours + ':' + minutes;
    const amOrPm = date.getHours() < 12 ? 'am' : 'pm';
    return dayMonthYear + '  ' + time + ' ' + amOrPm;
  };

  return (
    <DateInput
      disabled={
        props.disabled === undefined || props.disabled === null
          ? false
          : props.disabled
      }
      placeholder="D/M/YYYY H:MM"
      highlightCurrentDay={true}
      closeOnSelection={false}
      formatDate={renderDate}
      //This parse function is somewhat strict on format.
      parseDate={(str) => {
        try {
          return new Date(Date.parse(str));
        } catch {
          // ignore invalid entries
          return dateState;
        }
      }}
      timePickerProps={timeProps}
      // 10 years from the current day.
      maxDate={new Date(Date.now() + 60 * 60 * 24 * 365.25 * 10000)}
      //having the default value be dateState causes issues if an invalid time is input
      defaultValue={new Date(Date.now())}
      value={dateState}
      onChange={(date) => {
        props.onDateChange(date);
        setDateState(date);
      }}
    />
  );
}
