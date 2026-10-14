const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit',
  hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23',
});

export function formatPublishTime(date = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({type,value})=>[type,value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} +08:00`;
}

export function publishLogLine(message, date = new Date()) {
  return `[${formatPublishTime(date)}] ${message}`;
}
