/**
 * The one place icons come from: Phosphor, regular weight, as in the shop
 * (msk-shop components/icons). Lucide is on the redesign's exclusion list.
 *
 * Every icon is decorative by default (aria-hidden, not focusable). Give one
 * an aria-label or aria-labelledby and it is announced instead. An icon-only
 * button carries its name on the button, not on the icon.
 *
 * Only the icons listed here end up in the bundle. A new one is added to the
 * import and the export list in alphabetical order; one that loses its last
 * import goes.
 */
import {
  ArrowClockwise as ArrowClockwiseBase,
  ArrowCounterClockwise as ArrowCounterClockwiseBase,
  ArrowDown as ArrowDownBase,
  ArrowLeft as ArrowLeftBase,
  ArrowSquareOut as ArrowSquareOutBase,
  ArrowsClockwise as ArrowsClockwiseBase,
  CaretDown as CaretDownBase,
  CaretLeft as CaretLeftBase,
  CaretRight as CaretRightBase,
  CaretUp as CaretUpBase,
  ChartBar as ChartBarBase,
  Check as CheckBase,
  CheckCircle as CheckCircleBase,
  CircleNotch as CircleNotchBase,
  Copy as CopyBase,
  DownloadSimple as DownloadSimpleBase,
  FileCode as FileCodeBase,
  GearSix as GearSixBase,
  Info as InfoBase,
  List as ListBase,
  ListBullets as ListBulletsBase,
  Lock as LockBase,
  LockOpen as LockOpenBase,
  Minus as MinusBase,
  Monitor as MonitorBase,
  Moon as MoonBase,
  Palette as PaletteBase,
  PaperPlaneRight as PaperPlaneRightBase,
  Paperclip as PaperclipBase,
  Play as PlayBase,
  Plus as PlusBase,
  Robot as RobotBase,
  ShieldCheck as ShieldCheckBase,
  SignIn as SignInBase,
  SignOut as SignOutBase,
  Star as StarBase,
  Stop as StopBase,
  Sun as SunBase,
  Ticket as TicketBase,
  Translate as TranslateBase,
  Trash as TrashBase,
  Tray as TrayBase,
  UploadSimple as UploadSimpleBase,
  UserCircle as UserCircleBase,
  Warning as WarningBase,
  WarningCircle as WarningCircleBase,
  X as XBase,
  XCircle as XCircleBase,
} from '@phosphor-icons/react';

function decorative(Base) {
  function Decorative(props) {
    const labelled = props['aria-label'] != null || props['aria-labelledby'] != null;
    return <Base aria-hidden={labelled ? undefined : true} focusable="false" {...props} />;
  }
  Decorative.displayName = Base.displayName;
  return Decorative;
}

export const ArrowClockwise = decorative(ArrowClockwiseBase);
export const ArrowCounterClockwise = decorative(ArrowCounterClockwiseBase);
export const ArrowDown = decorative(ArrowDownBase);
export const ArrowLeft = decorative(ArrowLeftBase);
export const ArrowSquareOut = decorative(ArrowSquareOutBase);
export const ArrowsClockwise = decorative(ArrowsClockwiseBase);
export const CaretDown = decorative(CaretDownBase);
export const CaretLeft = decorative(CaretLeftBase);
export const CaretRight = decorative(CaretRightBase);
export const CaretUp = decorative(CaretUpBase);
export const ChartBar = decorative(ChartBarBase);
export const Check = decorative(CheckBase);
export const CheckCircle = decorative(CheckCircleBase);
export const CircleNotch = decorative(CircleNotchBase);
export const Copy = decorative(CopyBase);
export const DownloadSimple = decorative(DownloadSimpleBase);
export const FileCode = decorative(FileCodeBase);
export const GearSix = decorative(GearSixBase);
export const Info = decorative(InfoBase);
export const List = decorative(ListBase);
export const ListBullets = decorative(ListBulletsBase);
export const Lock = decorative(LockBase);
export const LockOpen = decorative(LockOpenBase);
export const Minus = decorative(MinusBase);
export const Monitor = decorative(MonitorBase);
export const Moon = decorative(MoonBase);
export const Palette = decorative(PaletteBase);
export const PaperPlaneRight = decorative(PaperPlaneRightBase);
export const Paperclip = decorative(PaperclipBase);
export const Play = decorative(PlayBase);
export const Plus = decorative(PlusBase);
export const Robot = decorative(RobotBase);
export const ShieldCheck = decorative(ShieldCheckBase);
export const SignIn = decorative(SignInBase);
export const SignOut = decorative(SignOutBase);
export const Star = decorative(StarBase);
export const Stop = decorative(StopBase);
export const Sun = decorative(SunBase);
export const Ticket = decorative(TicketBase);
export const Translate = decorative(TranslateBase);
export const Trash = decorative(TrashBase);
export const Tray = decorative(TrayBase);
export const UploadSimple = decorative(UploadSimpleBase);
export const UserCircle = decorative(UserCircleBase);
export const Warning = decorative(WarningBase);
export const WarningCircle = decorative(WarningCircleBase);
export const X = decorative(XBase);
export const XCircle = decorative(XCircleBase);
