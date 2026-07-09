       identification division.
       program-id. calculate-report.
       
       data division.
       working-storage section.
       01 bp-systolic-sum-text    pic x(20).
       01 bp-diastolic-sum-text   pic x(20).
       01 bp-count-text           pic x(20).
       01 glucose-sum-text        pic x(20).
       01 glucose-count-text      pic x(20).
       01 medication-total-text   pic x(20).
       01 medication-taken-text   pic x(20).
       01 medication-missed-text  pic x(20).
       01 medication-pending-text pic x(20).
       01 medication-due-text     pic x(20).

       01 bp-systolic-sum         pic 9(9) value 0.
       01 bp-diastolic-sum        pic 9(9) value 0.
       01 bp-count                pic 9(9) value 0.
       01 glucose-sum             pic 9(9) value 0.
       01 glucose-count           pic 9(9) value 0.
       01 medication-total        pic 9(9) value 0.
       01 medication-taken        pic 9(9) value 0.
       01 medication-missed       pic 9(9) value 0.
       01 medication-pending      pic 9(9) value 0.
       01 medication-due          pic 9(9) value 0.
       
       01 avg-systolic            pic 9(9) value 0.
       01 avg-diastolic           pic 9(9) value 0.
       01 avg-glucose             pic 9(9) value 0.
       01 compliance-percent      pic 9(9) value 0.
       01 bp-status               pic x(30) value spaces.
       01 glucose-status          pic x(30) value spaces.
       01 avg-systolic-json       pic x(12) value spaces.
       01 avg-diastolic-json      pic x(12) value spaces.
       01 avg-glucose-json        pic x(12) value spaces.
       01 compliance-json         pic x(12) value spaces.

       procedure division.
       main-procedure.
           accept bp-systolic-sum-text
           accept bp-diastolic-sum-text
           accept bp-count-text
           accept glucose-sum-text
           accept glucose-count-text
           accept medication-total-text
           accept medication-taken-text
           accept medication-missed-text
           accept medication-pending-text
           accept medication-due-text
       
           perform move-inputs
           perform calculate-averages
           perform calculate-statuses
           perform format-nullable-values
           perform display-json
       
           goback.

       move-inputs.
           if function trim(bp-systolic-sum-text) is numeric
               move function numval(bp-systolic-sum-text) to bp-systolic-sum
           end-if
           if function trim(bp-diastolic-sum-text) is numeric
               move function numval(bp-diastolic-sum-text) to bp-diastolic-sum
           end-if
           if function trim(bp-count-text) is numeric
               move function numval(bp-count-text) to bp-count
           end-if
           if function trim(glucose-sum-text) is numeric
               move function numval(glucose-sum-text) to glucose-sum
           end-if
           if function trim(glucose-count-text) is numeric
               move function numval(glucose-count-text) to glucose-count
           end-if
           if function trim(medication-total-text) is numeric
               move function numval(medication-total-text) to medication-total
           end-if
           if function trim(medication-taken-text) is numeric
               move function numval(medication-taken-text) to medication-taken
           end-if
           if function trim(medication-missed-text) is numeric
               move function numval(medication-missed-text) to medication-missed
           end-if
           if function trim(medication-pending-text) is numeric
               move function numval(medication-pending-text) to medication-pendi
           end-if
           if function trim(medication-due-text) is numeric
               move function numval(medication-due-text) to medication-due
           end-if.
       
       calculate-averages.
           if bp-count > 0
               compute avg-systolic rounded = bp-systolic-sum / bp-count
               compute avg-diastolic rounded = bp-diastolic-sum / bp-count
           end-if
           if glucose-count > 0
               compute avg-glucose rounded = glucose-sum / glucose-count
           end-if
           if medication-total > 0
               compute compliance-percent rounded =
                   (medication-taken * 100) / medication-total
           end-if.
       
       calculate-statuses.
           if bp-count = 0
               move "No blood pressure data" to bp-status
           else
               if avg-systolic < 90 or avg-diastolic < 60
                   move "Low" to bp-status
               else
                   if avg-systolic >= 140 or avg-diastolic >= 90
                       move "High" to bp-status
                   else
                       move "Stable" to bp-status
                   end-if
               end-if
           end-if

            if glucose-count = 0
            move "No blood glucose data" to glucose-status
            else
            if avg-glucose < 70
                move "Low" to glucose-status
            else
                if avg-glucose > 180
                    move "High" to glucose-status
                else
                    move "Stable" to glucose-status
                end-if
            end-if
           end-if.
    
        format-nullable-values.
           if bp-count = 0
               move "null" to avg-systolic-json
               move "null" to avg-diastolic-json
           else
               move function trim(function numval-c(avg-systolic)) to
                   avg-systolic-json
               move function trim(function numval-c(avg-diastolic)) to
                   avg-diastolic-json
           end-if
       
           if glucose-count = 0
               move "null" to avg-glucose-json
           else
               move function trim(function numval-c(avg-glucose)) to
                   avg-glucose-json
           end-if

           if medication-total = 0
               move "null" to compliance-json
           else
               move function trim(function numval-c(compliance-percent))
                to
                   compliance-json
           end-if.
   
       display-json.
            display '{"averageSystolic":' function trim(avg-systolic-json)
           ',"averageDiastolic":' function trim(avg-diastolic-json)
           ',"bloodPressureStatus":"'
           function trim(bp-status)
           '","averageGlucose":' function trim(avg-glucose-json)
           ',"bloodGlucoseStatus":"'
           function trim(glucose-status)
           '","medicationTotal":' function trim(function numval-c(
           medication-total))
           ',"medicationTaken":' function trim(function numval-c(
           medication-taken))
           ',"medicationMissed":' function trim(function numval-c(
           medication-missed))
           ',"medicationPending":' function trim(function numval-c(
           medication-pending))
           ',"medicationDueSoon":' function trim(function numval-c(
           medication-due))
           ',"compliancePercent":' function trim(compliance-json) '}'.
