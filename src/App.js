import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import axios from "axios";
import stringSimilarity from "string-similarity";

function App() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [newEvent, setNewEvent] = useState("");
  const [newEventTime, setNewEventTime] = useState("");
  const [categories, setCategories] = useState({});
  const [completedEvents, setCompletedEvents] = useState({});
  const [similarEvents, setSimilarEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingEventTitle, setEditingEventTitle] = useState("");
  const [editingEventTime, setEditingEventTime] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("모두"); // 카테고리 선택 상태 추가

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  // 유사성 검사 함수
  const checkForSimilarEvent = (newEventTitle, existingEvents) => {
    for (let event of existingEvents) {
      const similarity = stringSimilarity.compareTwoStrings(newEventTitle, event.title);
      if (similarity > 0.8) {
        return event;
      }
    }
    return null;
  };

  const handleAddEvent = async () => {
    if (newEvent.trim() === "" || newEventTime.trim() === "") return;

    const category = await categorizeEvent(newEvent);
    const parsed = parseNaturalLanguage(newEvent);
    if (!parsed) {
      alert("유효한 요일을 입력해주세요.");
      return;
    }

    const { eventDate, eventTitle } = parsed;
    const dateString = eventDate.toLocaleDateString();

    // 유사성 검사
    const existingEvents = events[dateString] || [];
    const similarEvent = checkForSimilarEvent(eventTitle, existingEvents);

    if (similarEvent) {
      alert(`비슷한 일정이 이미 있습니다: ${similarEvent.title}`);
      return;
    }

    const newEventObj = { title: eventTitle, time: newEventTime, category, completed: false };

    setEvents((prevEvents) => ({
      ...prevEvents,
      [dateString]: [...(prevEvents[dateString] || []), newEventObj],
    }));
    setCategories((prevCategories) => ({
      ...prevCategories,
      [eventTitle]: category,
    }));
    setNewEvent("");
    setNewEventTime("");
  };

  const categorizeEvent = async (eventText) => {
    try {
      const response = await axios.post("http://localhost:5000/categorize", { text: eventText });
      return response.data.category;
    } catch (error) {
      console.error("카테고리 분류 오류:", error);
      return "기타";
    }
  };

  const parseNaturalLanguage = (input) => {
    const today = new Date();
    const dayOfWeekMap = {
      "일요일": 0,
      "월요일": 1,
      "화요일": 2,
      "수요일": 3,
      "목요일": 4,
      "금요일": 5,
      "토요일": 6,
    };

    let eventDate = today;
    let eventTitle = input;

    const dayOfWeek = Object.keys(dayOfWeekMap).find(day => input.includes(day));
    if (dayOfWeek) {
      const targetDay = dayOfWeekMap[dayOfWeek];
      const todayDay = today.getDay();
      const daysUntilTarget = (targetDay + 7 - todayDay) % 7 || 7;
      eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilTarget);
      eventTitle = input.replace(dayOfWeek, "").trim();
    }

    if (!eventTitle) return null;
    return { eventDate, eventTitle };
  };

  const eventColors = {
    "회의": "#4CAF50",
    "운동": "#FFC107",
    "개인 일": "#03A9F4",
    "기타": "#9E9E9E"
  };

  const getEventColor = (category) => eventColors[category] || eventColors["기타"];

  const eventsForToday = events[date.toLocaleDateString()] || [];

  // 선택한 카테고리에 해당하는 일정만 필터링
  const filteredEvents = selectedCategory === "모두"
      ? eventsForToday
      : eventsForToday.filter(event => event.category === selectedCategory);

  const handleEventCompletion = (event, dateString) => {
    const updatedEvents = events[dateString].map((e) =>
        e.title === event.title ? { ...e, completed: !e.completed } : e
    );
    setEvents((prevEvents) => ({
      ...prevEvents,
      [dateString]: updatedEvents,
    }));
  };

  const handleDeleteEvent = (event, dateString) => {
    const updatedEvents = events[dateString].filter((e) => e.title !== event.title);
    setEvents((prevEvents) => ({
      ...prevEvents,
      [dateString]: updatedEvents,
    }));
  };

  const handleEditEvent = (event, dateString) => {
    setEditingEvent(event);
    setEditingEventTitle(event.title);
    setEditingEventTime(event.time);
  };

  const handleSaveEditEvent = () => {
    if (editingEvent && editingEventTitle.trim() !== "" && editingEventTime.trim() !== "") {
      const updatedEvents = events[date.toLocaleDateString()].map((e) =>
          e.title === editingEvent.title ? { ...e, title: editingEventTitle, time: editingEventTime } : e
      );
      setEvents((prevEvents) => ({
        ...prevEvents,
        [date.toLocaleDateString()]: updatedEvents,
      }));
      setEditingEvent(null);
      setEditingEventTitle("");
      setEditingEventTime("");
    }
  };

  return (
      <div className="App">
        <div className="container">
          <h1 className="my-4">개인 스케쥴러</h1>
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="calendar mb-4">
                <Calendar onChange={handleDateChange} value={date} />
              </div>
              <div className="events">
                <h2>Schedule for {date.toLocaleDateString()}</h2>

                {/* 카테고리 선택 드롭다운 */}
                <div className="form-group">
                  <label>카테고리 선택</label>
                  <select
                      className="form-control"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="모두">모두</option>
                    <option value="회의">회의</option>
                    <option value="운동">운동</option>
                    <option value="개인 일">개인 일</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div className="input-group mb-3">
                  <input
                      type="text"
                      className="form-control"
                      value={newEvent}
                      onChange={(e) => setNewEvent(e.target.value)}
                      placeholder="예: 금요일에 운동"
                  />
                  <input
                      type="time"
                      className="form-control"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                  />
                  <button className="btn btn-success" onClick={handleAddEvent}>
                    Add Event
                  </button>
                </div>

                <ul className="list-group">
                  {filteredEvents.map((event, index) => (
                      <li
                          key={index}
                          className="list-group-item d-flex justify-content-between align-items-center"
                          style={{
                            backgroundColor: getEventColor(event.category),
                            textDecoration: event.completed ? "line-through" : "none",
                          }}
                      >
                        {event.title} at {event.time} ({event.category})
                        <div>
                          <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEditEvent(event, date.toLocaleDateString())}
                          >
                            수정
                          </button>
                          <button
                              className="btn btn-success btn-sm ml-2"
                              onClick={() => handleEventCompletion(event, date.toLocaleDateString())}
                          >
                            {event.completed ? "취소" : "완료"}
                          </button>
                          <button
                              className="btn btn-danger btn-sm ml-2"
                              onClick={() => handleDeleteEvent(event, date.toLocaleDateString())}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                  ))}
                </ul>

                {editingEvent && (
                    <div className="edit-event">
                      <h3>일정 수정</h3>
                      <input
                          type="text"
                          value={editingEventTitle}
                          onChange={(e) => setEditingEventTitle(e.target.value)}
                          placeholder="수정할 일정 제목"
                      />
                      <input
                          type="time"
                          value={editingEventTime}
                          onChange={(e) => setEditingEventTime(e.target.value)}
                      />
                      <button className="btn btn-primary" onClick={handleSaveEditEvent}>
                        수정 저장
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditingEvent(null)}>
                        취소
                      </button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;
