identification division.
program-id. validate-schedule.

       data division.
       working-storage section.
       01 nurse-id          pic x(40).
       01 elderly-id        pic x(40).
       01 visit-date        pic x(40).
       01 visit-time        pic x(40).
       01 visit-purpose     pic x(80).
       01 schedule-status   pic x(40).
       01 allow-past        pic x(10).
       01 slot-lock-date    pic x(40).
       01 slot-lock-hour    pic x(2).
       01 recurrence-days   pic x(10).
       01 has-assigned-elder pic x(1).
       01 has-active-medication pic x(1).
       01 hour-text         pic x(2).
       01 minute-text       pic x(2).
       01 hour-number       pic 99.
       01 minute-number     pic 99.
       01 current-date-text pic x(8).
       01 current-time-text pic x(8).
       01 visit-date-text   pic x(8).
       01 visit-time-text   pic x(4).
       01 current-date-num  pic 9(8).
       01 current-time-num  pic 9(4).
       01 visit-date-num    pic 9(8).
       01 visit-time-num    pic 9(4).
       01 valid-flag        pic x value "Y".
       01 error-field       pic x(30) value spaces.
       01 error-message     pic x(90) value spaces.

       procedure division.
        main-procedure.
          accept nurse-id
          accept elderly-id
          accept visit-date
          accept visit-time
          accept visit-purpose
          accept schedule-status
          accept allow-past
          accept slot-lock-date
          accept slot-lock-hour
          accept recurrence-days
          accept has-assigned-elder
          accept has-active-medication
      
          perform validate-nurse-id
          perform validate-elderly-id
          perform validate-assigned-elder
          perform validate-active-medication
          perform validate-visit-date
          perform validate-visit-time
          perform validate-future-date-time
          perform validate-slot-lock
          perform validate-recurrence-days
          perform validate-purpose
          perform validate-schedule-status
      
          if valid-flag = "Y"
              display '{"valid":true,"errors":{}}'
          else
              display '{"valid":false,"errors":{"'
                  function trim(error-field) '":"'
                  function trim(error-message) '"}}'
          end-if
      
          goback.

       validate-nurse-id.
        if valid-flag = "Y"
        if function trim(nurse-id) = spaces
            move "N" to valid-flag
            move "nurseId" to error-field
            move "Select a valid nurse." to error-message
        else
            if function trim(nurse-id) is not numeric
                move "N" to valid-flag
                move "nurseId" to error-field
                move "Select a valid nurse." to error-message
            end-if
        end-if
       end-if.

       validate-elderly-id.
          if valid-flag = "Y"
              if function trim(elderly-id) = spaces
                  move "N" to valid-flag
                  move "elderlyId" to error-field
                  move "Select a valid elderly profile." to error-message
              else
                  if function trim(elderly-id) is not numeric
                      move "N" to valid-flag
                      move "elderlyId" to error-field
                      move "Select a valid elderly profile." to error-message
                  end-if
              end-if
          end-if.

       validate-assigned-elder.
          if valid-flag = "Y"
              if function trim(has-assigned-elder) not = "Y"
                  move "N" to valid-flag
                  move "elderlyId" to error-field
                  move "There is no assigned elder. Please assign first."
                   to error-message
              end-if
          end-if.

       validate-visit-date.
          if valid-flag = "Y"
              if function length(function trim(visit-date)) not = 10
                  move "N" to valid-flag
                  move "visitDate" to error-field
                  move "Enter visit date as YYYY-MM-DD." to error-message
              else
                  if visit-date(5:1) not = "-"
                      move "N" to valid-flag
                      move "visitDate" to error-field
                      move "Enter visit date as YYYY-MM-DD." to
                       error-message
                  else
                      if visit-date(8:1) not = "-"
                          move "N" to valid-flag
                          move "visitDate" to error-field
                          move "Enter visit date as YYYY-MM-DD." to
                           error-message
                      end-if
                  end-if
              end-if
          end-if.

       validate-visit-time.
          if valid-flag = "Y"
              if visit-time(3:1) not = ":"
                  move "N" to valid-flag
                  move "visitTime" to error-field
                  move "Enter visit time as HH:mm." to error-message
              else
                  move visit-time(1:2) to hour-text
                  move visit-time(4:2) to minute-text
                  if hour-text is not numeric
                      move "N" to valid-flag
                      move "visitTime" to error-field
                      move "Enter visit time as HH:mm." to error-message
                  else
                      if minute-text is not numeric
                          move "N" to valid-flag
                          move "visitTime" to error-field
                     move "Enter visit time as HH:mm." to error-message
                      else
                          move hour-text to hour-number
                          move minute-text to minute-number
                          if hour-number > 23
                              move "N" to valid-flag
                              move "visitTime" to error-field
                      move "Enter visit time as HH:mm." to error-message
                          else
                              if minute-number > 59
                                  move "N" to valid-flag
                                  move "visitTime" to error-field
                     move "Enter visit time as HH:mm." to error-message
                              end-if
                          end-if
                      end-if
                  end-if
              end-if
          end-if.

       validate-future-date-time.
          if valid-flag = "Y"
              if function trim(allow-past) not = "Y"
                  accept current-date-text from date yyyymmdd
                  accept current-time-text from time
      
                 string visit-date(1:4) visit-date(6:2) visit-date(9:2)
                      into visit-date-text
                  end-string
                  string visit-time(1:2) visit-time(4:2)
                      into visit-time-text
                  end-string
      
                  move current-date-text to current-date-num
                  move current-time-text(1:4) to current-time-num
                  move visit-date-text to visit-date-num
                  move visit-time-text to visit-time-num
      
                  if visit-date-num < current-date-num
                      move "N" to valid-flag
                      move "visitDate" to error-field
                      move "Visit date and time cannot be in the past." 
                      to error-message
                  else
                      if visit-date-num = current-date-num
                          if visit-time-num < current-time-num
                              move "N" to valid-flag
                              move "visitDate" to error-field
                      move "Visit date and time cannot be in the past."
                               to error-message
                          end-if
                      end-if
                  end-if
              end-if
          end-if.

       validate-purpose.
          if valid-flag = "Y"
              evaluate function trim(visit-purpose)
                  when "Blood Pressure"
                      continue
                  when "Blood Glucose"
                      continue
                  when "Medication"
                      continue
                  when "Routine Visit"
                      continue
                  when other
                      move "N" to valid-flag
                      move "purpose" to error-field
                      move "Select a valid purpose." to error-message
              end-evaluate
          end-if.

       validate-schedule-status.
          if valid-flag = "Y"
              evaluate function trim(schedule-status)
                  when "scheduled"
                      continue
                  when "completed"
                      continue
                  when "missed"
                      continue
                  when "cancelled"
                      continue
                  when other
                      move "N" to valid-flag
                      move "scheduleStatus" to error-field
                      move "Select a valid schedule status." to error-message
              end-evaluate
          end-if.

       validate-slot-lock.
          if valid-flag = "Y"
              if function trim(slot-lock-date) not = spaces
                  if function trim(slot-lock-date) not =
                   function trim(visit-date)
                      move "N" to valid-flag
                      move "visitDate" to error-field
            move "Schedule must stay within the selected calendar slot."
           to error-message
                  else
                      if function trim(slot-lock-hour) = spaces
                          move "N" to valid-flag
                          move "visitTime" to error-field
                          move "Selected calendar slot is invalid." to
                           error-message
                      else
                          if slot-lock-hour is not numeric
                              move "N" to valid-flag
                              move "visitTime" to error-field
                              move "Selected calendar slot is invalid."
                               to error-message
                          else
           if function trim(slot-lock-hour) not = function 
           trim(hour-text)
                                  move "N" to valid-flag
                                  move "visitTime" to error-field
            move"Schedule must stay within selected calendar time slot."
             
              to error-message
                              end-if
                          end-if
                      end-if
                  end-if
              end-if
          end-if.
      
       validate-recurrence-days.
          if valid-flag = "Y"
              if function trim(recurrence-days) not = spaces
                  if function trim(recurrence-days) not = "1"
                      and function trim(recurrence-days) not = "7"
                      move "N" to valid-flag
                      move "recurrenceIntervalDays" to error-field
                 move "Recurring schedule must repeat daily or weekly."
                  to error-message
                  end-if
              end-if
          end-if.

       validate-active-medication.
          if valid-flag = "Y"
              if function trim(visit-purpose) = "Medication"
                  if function trim(has-active-medication) not = "Y"
                      move "N" to valid-flag
                      move "purpose" to error-field
                      move "Add an active medication for this elderly profile before scheduling a medication visit."
                          to error-message
                  end-if
              end-if
          end-if.
      
