import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { SKILL_LABELS } from "@/constants/labels";
import { WEEKDAYS, type Weekday } from "@/lib/dates";
import { SKILLS, type Skill } from "@/types/user";

export interface LongTermFormValues {
  weekdays: Weekday[];
  startTime: string;
  endTime: string;
  firstDate: string;
  lastDate: string;
  roleName: string;
  description: string;
  capacity: string;
  minStaffing: string;
  requiredSkills: Skill[];
}

interface LongTermProgramFieldsProps {
  values: LongTermFormValues;
  editing?: boolean;
  onChange: <K extends keyof LongTermFormValues>(
    key: K,
    value: LongTermFormValues[K]
  ) => void;
}

export default function LongTermProgramFields({
  values,
  editing = false,
  onChange,
}: LongTermProgramFieldsProps) {
  return (
    <>
      <Card>
        <CardHeader
          title={editing ? "Program schedule" : "Weekly schedule"}
          description={
            editing
              ? "Schedule changes apply to sessions that have not started."
              : "A separate event and shift will be created for every selected day in this date range."
          }
        />
        <CardBody className="grid gap-4">
          {editing ? (
            <Alert tone="info">
              To change the first date or weekdays, cancel the remaining
              sessions and create a new program.
            </Alert>
          ) : null}
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-ink-800">
              Weekdays <span className="text-brand-600">*</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {WEEKDAYS.map((day) => (
                <Checkbox
                  key={day}
                  label={`${day[0].toUpperCase()}${day.slice(1)}`}
                  className="py-2"
                  checked={values.weekdays.includes(day)}
                  disabled={editing}
                  onChange={(e) =>
                    onChange(
                      "weekdays",
                      e.target.checked
                        ? [...values.weekdays, day]
                        : values.weekdays.filter((value) => value !== day)
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First date"
              type="date"
              required
              disabled={editing}
              value={values.firstDate}
              onChange={(e) => onChange("firstDate", e.target.value)}
            />
            <Input
              label="Last date"
              type="date"
              required
              min={values.firstDate || undefined}
              value={values.lastDate}
              hint={
                editing
                  ? "Moving this later adds sessions; moving it earlier cancels sessions after this date."
                  : undefined
              }
              onChange={(e) => onChange("lastDate", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start time"
              type="time"
              required
              value={values.startTime}
              onChange={(e) => onChange("startTime", e.target.value)}
            />
            <Input
              label="End time"
              type="time"
              required
              min={values.startTime || undefined}
              value={values.endTime}
              onChange={(e) => onChange("endTime", e.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Volunteer shift"
          description={
            editing
              ? "Changes apply to the shift on every upcoming session."
              : "This shift will be created for every session in the program."
          }
        />
        <CardBody className="grid gap-4">
          <Input
            label="Role name"
            required
            maxLength={80}
            placeholder="Robotics classroom volunteer"
            value={values.roleName}
            onChange={(e) => onChange("roleName", e.target.value)}
          />
          <Textarea
            label="What this role does"
            rows={3}
            maxLength={500}
            value={values.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Capacity"
              type="number"
              min={1}
              max={500}
              required
              value={values.capacity}
              onChange={(e) => onChange("capacity", e.target.value)}
            />
            <Input
              label="Minimum staffing"
              type="number"
              min={0}
              max={500}
              required
              value={values.minStaffing}
              onChange={(e) => onChange("minStaffing", e.target.value)}
              hint="You are alerted 72 hours out if fill is below this."
            />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold text-ink-800">
              Helpful skills (optional)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {SKILLS.map((skill) => (
                <Checkbox
                  key={skill}
                  label={SKILL_LABELS[skill]}
                  className="py-2"
                  checked={values.requiredSkills.includes(skill)}
                  onChange={(e) =>
                    onChange(
                      "requiredSkills",
                      e.target.checked
                        ? [...values.requiredSkills, skill]
                        : values.requiredSkills.filter(
                            (value) => value !== skill
                          )
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
        </CardBody>
      </Card>
    </>
  );
}
