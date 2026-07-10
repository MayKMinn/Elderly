       identification division.
       program-id. validate-report.
       
       data division.
       working-storage section.
       01 elderly-id       pic x(40).
       01 start-date       pic x(40).
       01 end-date         pic x(40).
       01 start-date-text  pic x(8).
       01 end-date-text    pic x(8).
       01 start-date-num   pic 9(8).
       01 end-date-num     pic 9(8).
       01 valid-flag       pic x value "Y".
       01 error-field      pic x(30) value spaces.
       01 error-message    pic x(90) value spaces.

       procedure division.
       main-procedure.
           accept elderly-id
           accept start-date
           accept end-date
       
           perform validate-elderly-id
           perform validate-start-date
           perform validate-end-date
           perform validate-date-range
       
           if valid-flag = "Y"
               display '{"valid":true,"errors":{}}'
           else
               display '{"valid":false,"errors":{"'
                   function trim(error-field) '":"'
                   function trim(error-message) '"}}'
           end-if
       
           goback.

       validate-elderly-id.
           if valid-flag = "Y"
               if function trim(elderly-id) = spaces
                   move "N" to valid-flag
                   move "elderlyId" to error-field
                   move "Select a valid elderly profile." to 
                   error-message
               else
                   if function trim(elderly-id) is not numeric
                       move "N" to valid-flag
                       move "elderlyId" to error-field
                       move "Select a valid elderly profile." to 
                       error-message
                   end-if
               end-if
           end-if.
       
       validate-start-date.
           if valid-flag = "Y"
               if function length(function trim(start-date)) not = 10
                   move "N" to valid-flag
                   move "startDate" to error-field
                   move "Enter start date as YYYY-MM-DD." to 
                   error-message
               else
                   if start-date(5:1) not = "-"
                       move "N" to valid-flag
                       move "startDate" to error-field
                       move "Enter start date as YYYY-MM-DD." to
                        error-message
                   else
                       if start-date(8:1) not = "-"
                           move "N" to valid-flag
                           move "startDate" to error-field
                           move "Enter start date as YYYY-MM-DD." to
                            error-message
                       end-if
                   end-if
               end-if
           end-if.

       validate-end-date.
           if valid-flag = "Y"
               if function length(function trim(end-date)) not = 10
                   move "N" to valid-flag
                   move "endDate" to error-field
                   move "Enter end date as YYYY-MM-DD." to error-message
               else
                   if end-date(5:1) not = "-"
                       move "N" to valid-flag
                       move "endDate" to error-field
                       move "Enter end date as YYYY-MM-DD." to
                        error-message
                   else
                       if end-date(8:1) not = "-"
                           move "N" to valid-flag
                           move "endDate" to error-field
                           move "Enter end date as YYYY-MM-DD." to
                            error-message
                       end-if
                   end-if
               end-if
           end-if.
       validate-date-range.
            if valid-flag = "Y"
               string start-date(1:4) start-date(6:2) start-date(9:2)
                   into start-date-text
               end-string
               string end-date(1:4) end-date(6:2) end-date(9:2)
                   into end-date-text
               end-string
       
               if start-date-text is not numeric
                   move "N" to valid-flag
                   move "startDate" to error-field
                   move "Enter start date as YYYY-MM-DD." to 
                   error-message
               else
                   if end-date-text is not numeric
                       move "N" to valid-flag
                       move "endDate" to error-field
                       move "Enter end date as YYYY-MM-DD." to 
                       error-message
                   else
                       move start-date-text to start-date-num
                       move end-date-text to end-date-num
                       if end-date-num < start-date-num
                           move "N" to valid-flag
                           move "endDate" to error-field
                           move "End date must be on or after start date." to
                               error-message
                       end-if
                   end-if
               end-if
            end-if.
