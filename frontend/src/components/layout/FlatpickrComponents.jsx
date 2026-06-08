import Flatpickr from "react-flatpickr";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import { createRoot } from "react-dom/client";
import "flatpickr/dist/themes/material_blue.css";
import "flatpickr/dist/plugins/monthSelect/style.css";
import InteractiveIcon from "./InteractiveIcon";
import CustomSelect from "./CustomSelect";

const BasePicker = ({
    value,
    onChange,
    options = {},
    label,
    error,
    classNameCss,
    leftIcon,
    rightIcon,
    width = 20,
    height = 20
}) => {

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    const mergedOptions = {
        ...options,

        onReady: (selectedDates, dateStr, instance) => {
            options?.onReady?.(selectedDates, dateStr, instance);

            const header = instance.calendarContainer.querySelector(".flatpickr-current-month");
            if (!header) return;

            header.querySelector(".flatpickr-monthDropdown-months")?.remove();
            header.querySelector(".cur-month")?.remove();

            if (!instance._monthRoot) {
                const mount = document.createElement("div");
                mount.className = "custom-month-select";
                header.appendChild(mount);

                instance._monthRoot = createRoot(mount);
            }

            const renderSelect = () => {
                instance._monthRoot.render(
                    <CustomSelect
                        key={instance.currentMonth}
                        options={months.map((m, i) => ({
                            value: i,
                            label: m
                        }))}

                        value={{
                            value: instance.currentMonth,
                            label: months[instance.currentMonth]
                        }}

                        onChange={(val) => {
                            instance.changeMonth(val.value, false);
                            instance.currentMonth = val.value;
                            instance.redraw();
                            setTimeout(() => {
                                renderSelect();
                            }, 0);
                        }}
                    />
                );
            };

            renderSelect();

            instance.config.onMonthChange = () => {
                renderSelect();
            };
        }
    };

    return (
        <div className="flatpickr-single-box">

            {label && (
                <label className="flatpickr-label">{label}</label>
            )}

            <div className="form-control-single-icon">

                {leftIcon && (
                    <div className="form-left-icon">
                        <InteractiveIcon
                            defaultIcon={leftIcon}
                            width={width}
                            height={height}
                        />
                    </div>
                )}

                <Flatpickr
                    value={value}
                    onChange={onChange}
                    options={mergedOptions}
                    className={`custom-form-control ${classNameCss || ""}`}
                />

                {rightIcon && (
                    <div className="form-right-icon">
                        {rightIcon}
                    </div>
                )}

            </div>

            {error && (
                <span style={{ color: "red" }}>
                    {error}
                </span>
            )}
        </div>
    );
};

export const DatePicker = (props) => (
    <BasePicker
        {...props}
        options={{
            dateFormat: "d-m-Y",
            ...props.options
        }}
    />
);

export const DateTimePicker = (props) => (
    <BasePicker
        {...props}
        options={{
            enableTime: true,
            dateFormat: "d-m-Y H:i",
            ...props.options
        }}
    />
);

export const TimePicker = (props) => (
    <BasePicker
        {...props}
        options={{
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            ...props.options
        }}
    />
);

export const RangePicker = (props) => (
    <BasePicker
        {...props}
        options={{
            mode: "range",
            dateFormat: "d-m-Y",
            ...props.options,
            closeOnSelect: false,  
        }}
    />
);

export const MonthPicker = (props) => (
    <BasePicker
        {...props}
        options={{
            plugins: [
                new monthSelectPlugin({
                    shorthand: true,
                    dateFormat: "Y-m"
                })
            ],
            ...props.options
        }}
    />
);

export const WeekPicker = (props) => (
    <BasePicker
        {...props}
        options={{
            weekNumbers: true,
            dateFormat: "Y-W",
            ...props.options
        }}
    />
);

export const InlineCalendar = (props) => (
    <BasePicker
        {...props}
        options={{
            inline: true,
            ...props.options
        }}
    />
);